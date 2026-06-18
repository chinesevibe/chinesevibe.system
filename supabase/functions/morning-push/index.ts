// morning-push: LINE reminder to employees who have not checked in today.
// Triggered by pg_cron via pg_net with the secret key — `auth: ["secret"]`
// rejects everything else. Standalone Deno code — no imports from src/.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, type WithSupabaseConfig } from "@supabase/server";

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
  fallbackTime2: string;
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
  work_shift_id: string | null;
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
    fallbackTime2: "11:00",
    remindAfterMin: 0,
    days: [1, 2, 3, 4, 5],
  },
  officer: {
    enabled: true,
    fallbackTime: "09:00",
    fallbackTime2: "11:00",
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

function cronSecretAuthConfig(): WithSupabaseConfig {
  const cronSecretKey = Deno.env.get("CRON_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return cronSecretKey
    ? { auth: ["secret"], env: { secretKeys: { default: cronSecretKey } } }
    : { auth: ["secret"] };
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
      fallbackTime2: parseTime(
        map.get(`${prefix}fallback_time_2`),
        defaults.fallbackTime2,
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

function resolveDueSchedule(
  config: MorningPushGroupConfig,
  fallbackTime: string,
): {
  effectiveDays: number[];
  dueMinute: number;
} {
  const rawDueMinute = parseMinuteOfDay(fallbackTime) + config.remindAfterMin;
  const overflowDays = Math.floor(rawDueMinute / 1440);
  const dueMinute = ((rawDueMinute % 1440) + 1440) % 1440;
  const effectiveDays = [
    ...new Set(config.days.map((day) => wrapWeekday(day + overflowDays))),
  ].sort((a, b) => a - b);
  return { effectiveDays, dueMinute };
}

function isDueNowForFallback(
  config: MorningPushGroupConfig,
  fallbackTime: string,
  weekday: number,
  minuteOfDay: number,
): {
  dueNow: boolean;
  effectiveDays: number[];
  dueMinute: number;
  slotMinute: number;
  reason: string | null;
} {
  const { effectiveDays, dueMinute } = resolveDueSchedule(config, fallbackTime);
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

function getDueShiftSlots(
  config: MorningPushGroupConfig,
  weekday: number,
  minuteOfDay: number,
): number[] {
  const slots: number[] = [];
  if (
    isDueNowForFallback(config, config.fallbackTime, weekday, minuteOfDay).dueNow
  ) {
    slots.push(0);
  }
  if (
    isDueNowForFallback(config, config.fallbackTime2, weekday, minuteOfDay).dueNow
  ) {
    slots.push(1);
  }
  return slots;
}

function buildShiftSlotById(shifts: WorkShiftRow[]): Map<string, number> {
  const sorted = [...shifts].sort((a, b) => {
    const aStart = a.start_hour * 60 + a.start_minute;
    const bStart = b.start_hour * 60 + b.start_minute;
    return aStart - bStart;
  });
  const map = new Map<string, number>();
  for (let i = 0; i < Math.min(sorted.length, 2); i++) {
    map.set(sorted[i]!.id, i);
  }
  return map;
}

function employeeShiftSlot(
  employee: EmployeeRow,
  shiftSlotById: Map<string, number>,
): number {
  if (!employee.work_shift_id) return 0;
  return shiftSlotById.get(employee.work_shift_id) ?? 0;
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
  dueSlots: number[],
  weekday: number,
  minuteOfDay: number,
): GroupResult {
  const primaryState = isDueNowForFallback(
    config,
    config.fallbackTime,
    weekday,
    minuteOfDay,
  );
  return {
    enabled: config.enabled,
    dueNow: dueSlots.length > 0,
    configuredDays: config.days,
    effectiveDays: primaryState.effectiveDays,
    dueTime: `${config.fallbackTime}, ${config.fallbackTime2}`,
    dueMinute: primaryState.dueMinute,
    slotMinute: primaryState.slotMinute,
    targets: 0,
    pushed: 0,
    reason: dueSlots.length > 0 ? null : primaryState.reason,
  };
}

const RETRO_WINDOW_MS = 48 * 60 * 60 * 1000;

type WorkShiftRow = {
  id: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  crosses_midnight: boolean;
  grace_minutes: number;
};

type AttendanceLite = {
  employee_id: string;
  check_in_at: string;
  check_out_at: string | null;
  shift_date: string | null;
};

function padTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function ictLocalToUtc(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const ictAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  return new Date(ictAsUtcMs - ICT_OFFSET_MS);
}

function addIctDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function getShiftEndUtc(workDate: string, shift: WorkShiftRow): Date {
  const endDate = shift.crosses_midnight ? addIctDays(workDate, 1) : workDate;
  return ictLocalToUtc(
    endDate,
    padTime(shift.end_hour, shift.end_minute),
  );
}

function getShiftStartUtc(workDate: string, shift: WorkShiftRow): Date {
  return ictLocalToUtc(
    workDate,
    padTime(shift.start_hour, shift.start_minute),
  );
}

function isWithinRetroWindow(
  workDate: string,
  shift: WorkShiftRow,
  now: Date,
): boolean {
  const deadline = getShiftEndUtc(workDate, shift).getTime() + RETRO_WINDOW_MS;
  return now.getTime() <= deadline;
}

function datesLastDays(fromDate: string, count: number): string[] {
  const dates: string[] = [];
  const [y, m, d] = fromDate.split("-").map(Number);
  for (let i = 0; i < count; i++) {
    dates.push(
      new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10),
    );
  }
  return dates;
}

function buildRetroReminderText(
  issues: Array<{ date: string; issue: "missing_checkin" | "missing_checkout" }>,
  baseUrl: string,
): string {
  const lines = issues.slice(0, 5).map((item) => {
    const label = item.issue === "missing_checkin"
      ? "ลืมเช็คเข้า"
      : "ลืมเช็คออก";
    return `• ${item.date} (${label}) → ${baseUrl}/liff/attendance?date=${item.date}`;
  });
  return [
    "แจ้งเตือน: มีวันที่ลืมลงเวลาเข้า/ออก — แก้ได้ภายใน 48 ชม.",
    ...lines,
    "กดลิงก์เพื่อเลือกวันและลงเวลาย้อนหลัง",
  ].join("\n");
}

async function pushRetroReminders(
  admin: {
    from: (table: string) => {
      select: (columns: string) => Record<string, unknown>;
    };
  },
  employees: EmployeeRow[],
  now: Date,
  ictDate: string,
  lineApiBase: string,
  lineToken: string,
): Promise<number> {
  const appBase = (Deno.env.get("APP_PUBLIC_URL") ??
    "https://hr-app-two-iota.vercel.app").replace(/\/$/, "");

  const shiftIds = [
    ...new Set(
      employees
        .map((e) => e.work_shift_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (shiftIds.length === 0) return 0;

  const { data: shifts, error: shiftError } = await admin
    .from("hr_work_shifts")
    .select(
      "id, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes",
    )
    .in("id", shiftIds);
  if (shiftError) throw shiftError;

  const shiftById = new Map(
    ((shifts ?? []) as WorkShiftRow[]).map((shift) => [shift.id, shift]),
  );

  const lookbackDates = datesLastDays(ictDate, 4);
  const rangeStart = ictLocalToUtc(lookbackDates[lookbackDates.length - 1]!, "00:00");
  const rangeEnd = new Date(
    ictLocalToUtc(ictDate, "00:00").getTime() + DAY_MS,
  );

  const employeeIds = employees.map((e) => e.id);
  const [{ data: attendanceRows, error: attError }, { data: leaveRows, error: leaveError }] =
    await Promise.all([
      admin
        .from("hr_attendance")
        .select("employee_id, check_in_at, check_out_at, shift_date")
        .in("employee_id", employeeIds)
        .gte("check_in_at", rangeStart.toISOString())
        .lt("check_in_at", rangeEnd.toISOString()),
      admin
        .from("hr_leaves")
        .select("employee_id, start_date, end_date")
        .in("employee_id", employeeIds)
        .eq("status", "approved")
        .lte("start_date", ictDate)
        .gte("end_date", lookbackDates[lookbackDates.length - 1]!),
    ]);
  if (attError) throw attError;
  if (leaveError) throw leaveError;

  const leaveByEmployee = new Map<string, Set<string>>();
  for (const row of leaveRows ?? []) {
    const set = leaveByEmployee.get(row.employee_id as string) ?? new Set<string>();
    let cursor = row.start_date as string;
    const end = row.end_date as string;
    while (cursor <= end) {
      set.add(cursor);
      const [y, m, d] = cursor.split("-").map(Number);
      cursor = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    }
    leaveByEmployee.set(row.employee_id as string, set);
  }

  const attendanceByEmployeeDate = new Map<string, AttendanceLite>();
  for (const row of (attendanceRows ?? []) as AttendanceLite[]) {
    const date = row.shift_date ??
      new Date(new Date(row.check_in_at).getTime() + ICT_OFFSET_MS)
        .toISOString()
        .slice(0, 10);
    attendanceByEmployeeDate.set(`${row.employee_id}:${date}`, row);
  }

  let pushed = 0;

  for (const employee of employees) {
    if (!employee.line_user_id || !employee.work_shift_id) continue;
    const shift = shiftById.get(employee.work_shift_id);
    if (!shift) continue;

    const onLeave = leaveByEmployee.get(employee.id) ?? new Set<string>();
    const issues: Array<{ date: string; issue: "missing_checkin" | "missing_checkout" }> = [];

    for (const date of lookbackDates) {
      if (date > ictDate || onLeave.has(date)) continue;
      if (!isWithinRetroWindow(date, shift, now)) continue;

      const record = attendanceByEmployeeDate.get(`${employee.id}:${date}`);
      if (!record) {
        if (now.getTime() > getShiftStartUtc(date, shift).getTime() + shift.grace_minutes * 60_000) {
          issues.push({ date, issue: "missing_checkin" });
        }
        continue;
      }
      if (!record.check_out_at && now.getTime() > getShiftEndUtc(date, shift).getTime()) {
        issues.push({ date, issue: "missing_checkout" });
      }
    }

    if (issues.length === 0) continue;

    const response = await fetch(`${lineApiBase}/v2/bot/message/push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        to: employee.line_user_id,
        messages: [{
          type: "text",
          text: buildRetroReminderText(issues, appBase),
        }],
      }),
    });
    if (response.ok) pushed += 1;
    else {
      const body = await response.text();
      console.error(`LINE retro push failed for ${employee.id}: ${response.status} ${body}`);
    }
  }

  return pushed;
}

const handler = {
  fetch: withSupabase(cronSecretAuthConfig(), async (_req, ctx) => {
    const now = new Date();
    const { start, end } = ictDayRangeUtc(now);
    const ictClock = getIctClock(now);
    const admin = ctx.supabaseAdmin;

    const runtimeKeys = [
      "morning_push_employee_enabled",
      "morning_push_employee_fallback_time",
      "morning_push_employee_fallback_time_2",
      "morning_push_employee_remind_after_min",
      "morning_push_employee_days",
      "morning_push_officer_enabled",
      "morning_push_officer_fallback_time",
      "morning_push_officer_fallback_time_2",
      "morning_push_officer_remind_after_min",
      "morning_push_officer_days",
    ];

    const [
      runtimeConfigResult,
      employeesResult,
      attendanceResult,
      shiftsResult,
    ] = await Promise.all([
      admin
        .from("hr_runtime_config")
        .select("key, value")
        .in("key", runtimeKeys),
      admin
        .from("hr_employees")
        .select("id, line_user_id, department, position, role, branch_id, work_shift_id")
        .eq("status", "active")
        .not("line_user_id", "is", null),
      admin
        .from("hr_attendance")
        .select("employee_id")
        .gte("check_in_at", start.toISOString())
        .lt("check_in_at", end.toISOString()),
      admin
        .from("hr_work_shifts")
        .select(
          "id, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes",
        )
        .eq("is_active", true),
    ]);

    if (runtimeConfigResult.error) throw runtimeConfigResult.error;
    if (employeesResult.error) throw employeesResult.error;
    if (attendanceResult.error) throw attendanceResult.error;
    if (shiftsResult.error) throw shiftsResult.error;

    const configs = parseMorningPushFromRows(
      (runtimeConfigResult.data ?? []) as RuntimeConfigRow[],
    );
    const shiftSlotById = buildShiftSlotById(
      (shiftsResult.data ?? []) as WorkShiftRow[],
    );
    const employeeDueSlots = getDueShiftSlots(
      configs.employee,
      ictClock.weekday,
      ictClock.minuteOfDay,
    );
    const officerDueSlots = getDueShiftSlots(
      configs.officer,
      ictClock.weekday,
      ictClock.minuteOfDay,
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
      const dueSlots = group === "employee" ? employeeDueSlots : officerDueSlots;
      const slot = employeeShiftSlot(employee, shiftSlotById);
      if (!dueSlots.includes(slot)) continue;
      groupedTargets[group].push(employee.line_user_id);
    }

    const result: Record<MorningPushGroup, GroupResult> = {
      employee: emptyGroupResult(
        configs.employee,
        employeeDueSlots,
        ictClock.weekday,
        ictClock.minuteOfDay,
      ),
      officer: emptyGroupResult(
        configs.officer,
        officerDueSlots,
        ictClock.weekday,
        ictClock.minuteOfDay,
      ),
    };

    const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
    const shouldPushEmployee =
      employeeDueSlots.length > 0 && groupedTargets.employee.length > 0;
    const shouldPushOfficer =
      officerDueSlots.length > 0 && groupedTargets.officer.length > 0;
    const lineToken = shouldPushEmployee || shouldPushOfficer || employeeDueSlots.length > 0
      ? requireEnv("LINE_CHANNEL_ACCESS_TOKEN")
      : null;

    if (employeeDueSlots.length > 0) {
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

    if (officerDueSlots.length > 0) {
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

    let retroPushed = 0;
    if (employeeDueSlots.length > 0 && lineToken) {
      retroPushed = await pushRetroReminders(
        admin,
        (employeesResult.data ?? []) as EmployeeRow[],
        now,
        ictClock.isoDate,
        lineApiBase,
        lineToken as string,
      );
    }

    return Response.json({
      ictDate: ictClock.isoDate,
      weekday: ictClock.weekday,
      minuteOfDay: ictClock.minuteOfDay,
      employee: result.employee,
      officer: result.officer,
      retroRemindersPushed: retroPushed,
    });
  }),
};

export default handler;
