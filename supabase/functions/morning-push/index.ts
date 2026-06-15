// morning-push: LINE reminder to employees who have not checked in today.
// Triggered by pg_cron via pg_net with the secret key — `auth: ["secret"]`
// rejects everything else. Standalone Deno code — no imports from src/.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const SLOT_MINUTES = 15;
const MULTICAST_LIMIT = 500;
const VALID_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type MorningPushGroup = "employee" | "officer";

type RuntimeConfigRow = {
  key: string;
  value: string;
};

type MorningPushGroupConfig = {
  enabled: boolean;
  fallbackTime: string;
  remindAfterMin: number;
  days: number[];
};

type EmployeeRow = {
  id: string;
  line_user_id: string | null;
  department: string | null;
  position: string | null;
  role: string | null;
  branch_id: string | null;
};

type BranchRow = {
  id: string;
  code: string | null;
};

type GroupResult = {
  enabled: boolean;
  dueNow: boolean;
  configuredDays: number[];
  effectiveDays: number[];
  dueTime: string;
  dueMinute: number;
  slotMinute: number;
  targets: number;
  pushed: number;
  reason: string | null;
};

const MORNING_PUSH_DEFAULTS: Record<MorningPushGroup, MorningPushGroupConfig> = {
  employee: {
    enabled: true,
    fallbackTime: "09:00",
    remindAfterMin: 0,
    days: [1, 2, 3, 4, 5],
  },
  officer: {
    enabled: true,
    fallbackTime: "09:00",
    remindAfterMin: 0,
    days: [1, 2, 3, 4, 5],
  },
};

function ictDayRangeUtc(now: Date): { start: Date; end: Date } {
  const ictMs = now.getTime() + ICT_OFFSET_MS;
  const dayStartMs = Math.floor(ictMs / DAY_MS) * DAY_MS;
  const start = new Date(dayStartMs - ICT_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

function weekdayFromShiftedUtcDay(shiftedUtcDay: number): number {
  return shiftedUtcDay === 0 ? 7 : shiftedUtcDay;
}

function getIctClock(now: Date): {
  weekday: number;
  minuteOfDay: number;
  isoDate: string;
} {
  const shifted = new Date(now.getTime() + ICT_OFFSET_MS);
  return {
    weekday: weekdayFromShiftedUtcDay(shifted.getUTCDay()),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    isoDate: shifted.toISOString().slice(0, 10),
  };
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function parseTime(value: string | undefined, fallback: string) {
  return value && VALID_TIME_RE.test(value) ? value : fallback;
}

function parseRemindMinutes(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 120) {
    return fallback;
  }
  return parsed;
}

function parseDays(value: string | undefined, fallback: number[]) {
  if (!value) return fallback;
  const days = value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  const unique = [...new Set(days)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : fallback;
}

function parseMorningPushFromRows(
  rows: RuntimeConfigRow[],
): Record<MorningPushGroup, MorningPushGroupConfig> {
  const map = new Map(rows.map((row) => [row.key, row.value]));

  function parseGroup(group: MorningPushGroup): MorningPushGroupConfig {
    const defaults = MORNING_PUSH_DEFAULTS[group];
    const prefix = `morning_push_${group}_`;
    return {
      enabled: parseBoolean(map.get(`${prefix}enabled`), defaults.enabled),
      fallbackTime: parseTime(
        map.get(`${prefix}fallback_time`),
        defaults.fallbackTime,
      ),
      remindAfterMin: parseRemindMinutes(
        map.get(`${prefix}remind_after_min`),
        defaults.remindAfterMin,
      ),
      days: parseDays(map.get(`${prefix}days`), defaults.days),
    };
  }

  return {
    employee: parseGroup("employee"),
    officer: parseGroup("officer"),
  };
}

function parseMinuteOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function wrapWeekday(day: number): number {
  return ((day - 1 + 7) % 7) + 1;
}

function resolveDueSchedule(config: MorningPushGroupConfig): {
  effectiveDays: number[];
  dueMinute: number;
} {
  const rawDueMinute = parseMinuteOfDay(config.fallbackTime) + config.remindAfterMin;
  const overflowDays = Math.floor(rawDueMinute / 1440);
  const dueMinute = ((rawDueMinute % 1440) + 1440) % 1440;
  const effectiveDays = [
    ...new Set(config.days.map((day) => wrapWeekday(day + overflowDays))),
  ].sort((a, b) => a - b);
  return { effectiveDays, dueMinute };
}

function isDueNow(
  config: MorningPushGroupConfig,
  weekday: number,
  minuteOfDay: number,
): {
  dueNow: boolean;
  effectiveDays: number[];
  dueMinute: number;
  slotMinute: number;
  reason: string | null;
} {
  const { effectiveDays, dueMinute } = resolveDueSchedule(config);
  const slotMinute = Math.floor(minuteOfDay / SLOT_MINUTES) * SLOT_MINUTES;

  if (!config.enabled) {
    return {
      dueNow: false,
      effectiveDays,
      dueMinute,
      slotMinute,
      reason: "disabled",
    };
  }

  if (!effectiveDays.includes(weekday)) {
    return {
      dueNow: false,
      effectiveDays,
      dueMinute,
      slotMinute,
      reason: "day_not_allowed",
    };
  }

  if (dueMinute < slotMinute || dueMinute >= slotMinute + SLOT_MINUTES) {
    return {
      dueNow: false,
      effectiveDays,
      dueMinute,
      slotMinute,
      reason: "time_not_due",
    };
  }

  return {
    dueNow: true,
    effectiveDays,
    dueMinute,
    slotMinute,
    reason: null,
  };
}

function isOfficerEmployee(
  employee: EmployeeRow,
  branchCode: string | null | undefined,
): boolean {
  const department = normalizeText(employee.department);
  const position = normalizeText(employee.position);
  const role = normalizeText(employee.role);
  const normalizedBranchCode = branchCode?.trim();

  if (department === "hr officer") return true;
  if (department === "officer" && position === "hr officer") return true;
  return normalizedBranchCode === "000" && role === "hr";
}

async function pushLineTargets(
  targets: string[],
  lineApiBase: string,
  lineToken: string,
): Promise<number> {
  let pushed = 0;

  for (let i = 0; i < targets.length; i += MULTICAST_LIMIT) {
    const chunk = targets.slice(i, i + MULTICAST_LIMIT);
    const response = await fetch(`${lineApiBase}/v2/bot/message/multicast`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: chunk,
        messages: [
          {
            type: "text",
            text:
              'อย่าลืมเช็คอินเข้างานวันนี้ — กดปุ่ม "เช็คอิน" ที่เมนูด้านล่างแล้วแชร์ตำแหน่งได้เลยครับ',
          },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`LINE multicast failed: ${response.status} ${body}`);
      continue;
    }
    pushed += chunk.length;
  }

  return pushed;
}

function emptyGroupResult(
  config: MorningPushGroupConfig,
  state: ReturnType<typeof isDueNow>,
): GroupResult {
  return {
    enabled: config.enabled,
    dueNow: state.dueNow,
    configuredDays: config.days,
    effectiveDays: state.effectiveDays,
    dueTime: config.fallbackTime,
    dueMinute: state.dueMinute,
    slotMinute: state.slotMinute,
    targets: 0,
    pushed: 0,
    reason: state.reason,
  };
}

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const now = new Date();
    const { start, end } = ictDayRangeUtc(now);
    const ictClock = getIctClock(now);
    const admin = ctx.supabaseAdmin;

    const runtimeKeys = [
      "morning_push_employee_enabled",
      "morning_push_employee_fallback_time",
      "morning_push_employee_remind_after_min",
      "morning_push_employee_days",
      "morning_push_officer_enabled",
      "morning_push_officer_fallback_time",
      "morning_push_officer_remind_after_min",
      "morning_push_officer_days",
    ];

    const [
      runtimeConfigResult,
      employeesResult,
      attendanceResult,
    ] = await Promise.all([
      admin
        .from("hr_runtime_config")
        .select("key, value")
        .in("key", runtimeKeys),
      admin
        .from("hr_employees")
        .select("id, line_user_id, department, position, role, branch_id")
        .eq("status", "active")
        .not("line_user_id", "is", null),
      admin
        .from("hr_attendance")
        .select("employee_id")
        .gte("check_in_at", start.toISOString())
        .lt("check_in_at", end.toISOString()),
    ]);

    if (runtimeConfigResult.error) throw runtimeConfigResult.error;
    if (employeesResult.error) throw employeesResult.error;
    if (attendanceResult.error) throw attendanceResult.error;

    const configs = parseMorningPushFromRows(
      (runtimeConfigResult.data ?? []) as RuntimeConfigRow[],
    );

    const branchIds = [
      ...new Set(
        ((employeesResult.data ?? []) as EmployeeRow[])
          .map((employee) => employee.branch_id)
          .filter((branchId): branchId is string => Boolean(branchId)),
      ),
    ];

    const branchCodeById = new Map<string, string | null>();
    if (branchIds.length > 0) {
      const { data: branches, error: branchesError } = await admin
        .from("hr_branches")
        .select("id, code")
        .in("id", branchIds);
      if (branchesError) throw branchesError;
      for (const branch of (branches ?? []) as BranchRow[]) {
        branchCodeById.set(branch.id, branch.code);
      }
    }

    const checkedIn = new Set(
      (attendanceResult.data ?? []).map((row) => row.employee_id),
    );

    const groupedTargets: Record<MorningPushGroup, string[]> = {
      employee: [],
      officer: [],
    };

    for (const employee of (employeesResult.data ?? []) as EmployeeRow[]) {
      if (!employee.line_user_id || checkedIn.has(employee.id)) continue;
      const branchCode = employee.branch_id
        ? branchCodeById.get(employee.branch_id) ?? null
        : null;
      const group: MorningPushGroup = isOfficerEmployee(employee, branchCode)
        ? "officer"
        : "employee";
      groupedTargets[group].push(employee.line_user_id);
    }

    const employeeState = isDueNow(
      configs.employee,
      ictClock.weekday,
      ictClock.minuteOfDay,
    );
    const officerState = isDueNow(
      configs.officer,
      ictClock.weekday,
      ictClock.minuteOfDay,
    );

    const result: Record<MorningPushGroup, GroupResult> = {
      employee: emptyGroupResult(configs.employee, employeeState),
      officer: emptyGroupResult(configs.officer, officerState),
    };

    const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
    const shouldPushEmployee = employeeState.dueNow && groupedTargets.employee.length > 0;
    const shouldPushOfficer = officerState.dueNow && groupedTargets.officer.length > 0;
    const lineToken = shouldPushEmployee || shouldPushOfficer
      ? requireEnv("LINE_CHANNEL_ACCESS_TOKEN")
      : null;

    if (employeeState.dueNow) {
      result.employee.targets = groupedTargets.employee.length;
      result.employee.reason = groupedTargets.employee.length > 0
        ? null
        : "no_targets";
      if (groupedTargets.employee.length > 0) {
        result.employee.pushed = await pushLineTargets(
          groupedTargets.employee,
          lineApiBase,
          lineToken as string,
        );
      }
    }

    if (officerState.dueNow) {
      result.officer.targets = groupedTargets.officer.length;
      result.officer.reason = groupedTargets.officer.length > 0
        ? null
        : "no_targets";
      if (groupedTargets.officer.length > 0) {
        result.officer.pushed = await pushLineTargets(
          groupedTargets.officer,
          lineApiBase,
          lineToken as string,
        );
      }
    }

    return Response.json({
      ictDate: ictClock.isoDate,
      weekday: ictClock.weekday,
      minuteOfDay: ictClock.minuteOfDay,
      employee: result.employee,
      officer: result.officer,
    });
  }),
};

export default handler;
