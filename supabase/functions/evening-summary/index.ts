// evening-summary (T24+T25): weekday 18:00 ICT push —
// 1) per-employee daily attendance Flex summary
// 2) HR group aggregate summary (check-in / absent / late / on-leave)
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, type WithSupabaseConfig } from "@supabase/server";

import { buildDailyRoster, formatNameList } from "../_shared/daily-roster.ts";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const MULTICAST_LIMIT = 500;

function ictDayRangeUtc(now: Date): { start: Date; end: Date } {
  const ictMs = now.getTime() + ICT_OFFSET_MS;
  const dayStartMs = Math.floor(ictMs / 86_400_000) * 86_400_000;
  const start = new Date(dayStartMs - ICT_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

function ictDateString(instant: Date): string {
  return new Date(instant.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function formatIctTime(iso: string): string {
  const ictMs = new Date(iso).getTime() + ICT_OFFSET_MS;
  const minutesOfDay = Math.floor((ictMs % 86_400_000) / 60_000);
  const hh = String(Math.floor(minutesOfDay / 60)).padStart(2, "0");
  const mm = String(minutesOfDay % 60).padStart(2, "0");
  return `${hh}:${mm}`;
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

type Employee = {
  id: string;
  name: string;
  line_user_id: string | null;
};

type Attendance = {
  employee_id: string;
  check_in_at: string;
  check_out_at: string | null;
  is_late: boolean;
  work_hours: number | null;
};

function employeeSummaryText(
  name: string,
  today: string,
  att: Attendance | undefined,
): string {
  if (!att) {
    return `สรุปการทำงาน ${today}\n${name}\nสถานะ: ไม่มีการเช็คอินวันนี้`;
  }
  const inText = formatIctTime(att.check_in_at);
  const outText = att.check_out_at ? formatIctTime(att.check_out_at) : "—";
  const hours = att.work_hours?.toFixed(1) ?? "—";
  const status = att.is_late ? "มาสาย" : att.check_out_at ? "ปกติ" : "ยังไม่เช็คเอาท์";
  return [
    `สรุปการทำงาน ${today}`,
    name,
    `เข้า: ${inText} | ออก: ${outText}`,
    `ชม.: ${hours} | สถานะ: ${status}`,
  ].join("\n");
}

const handler = {
  fetch: withSupabase(cronSecretAuthConfig(), async (_req, ctx) => {
    const now = new Date();
    const { start, end } = ictDayRangeUtc(now);
    const today = ictDateString(now);
    const admin = ctx.supabaseAdmin;
    const roster = await buildDailyRoster(admin, { date: today, now });

    const { data: employees, error: empError } = await admin
      .from("hr_employees")
      .select("id, name, line_user_id")
      .eq("status", "active");
    if (empError) throw empError;

    const { data: attendance, error: attError } = await admin
      .from("hr_attendance")
      .select("employee_id, check_in_at, check_out_at, is_late, work_hours")
      .gte("check_in_at", start.toISOString())
      .lt("check_in_at", end.toISOString());
    if (attError) throw attError;

    const attByEmployee = new Map<string, Attendance>();
    for (const row of (attendance ?? []) as Attendance[]) {
      attByEmployee.set(row.employee_id, row);
    }

    const activeList = (employees ?? []) as Employee[];
    const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
    const lineToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
    const lineHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${lineToken}`,
    };

    const employeeTargets = activeList.filter((e) => e.line_user_id);
    let employeePushed = 0;

    for (let i = 0; i < employeeTargets.length; i += MULTICAST_LIMIT) {
      const chunk = employeeTargets.slice(i, i + MULTICAST_LIMIT);
      const messages = chunk.map((e) => ({
        type: "text",
        text: employeeSummaryText(
          e.name,
          today,
          attByEmployee.get(e.id),
        ),
      }));

      for (let j = 0; j < chunk.length; j++) {
        const response = await fetch(`${lineApiBase}/v2/bot/message/push`, {
          method: "POST",
          headers: lineHeaders,
          body: JSON.stringify({
            to: chunk[j].line_user_id,
            messages: [messages[j]],
          }),
        });
        if (response.ok) employeePushed += 1;
        else {
          console.error(
            `employee push failed: ${response.status} ${await response.text()}`,
          );
        }
      }
    }

    const lateEmployees = roster.groups.flatMap((group) =>
      group.employees.filter((employee) => employee.status === "late")
    );
    const absentEmployees = roster.groups.flatMap((group) =>
      group.employees.filter((employee) => employee.status === "absent")
    );
    const leaveEmployees = roster.groups.flatMap((group) =>
      group.employees.filter((employee) => employee.status === "on_leave")
    );

    const hrMessage = {
      type: "text",
      text: [
        `สรุปภาพรวมการทำงาน ${today}`,
        `มาแล้ว: ${roster.totals.checkedIn} คน`,
        `ขาด: ${roster.totals.absent} คน`,
        `มาสาย: ${roster.totals.late} คน`,
        `ลา: ${roster.totals.onLeave} คน`,
        `พนักงาน active: ${roster.totals.total} คน`,
        `รายชื่อมาสาย: ${formatNameList(lateEmployees)}`,
        `รายชื่อขาด: ${formatNameList(absentEmployees)}`,
        `รายชื่อลา: ${formatNameList(leaveEmployees)}`,
      ].join("\n"),
    };

    let hrPushed = 0;
    const groupId = Deno.env.get("HR_LINE_GROUP_ID");
    if (groupId) {
      const response = await fetch(`${lineApiBase}/v2/bot/message/push`, {
        method: "POST",
        headers: lineHeaders,
        body: JSON.stringify({ to: groupId, messages: [hrMessage] }),
      });
      if (response.ok) hrPushed = 1;
      else {
        console.error(
          `HR group push failed: ${response.status} ${await response.text()}`,
        );
      }
    } else {
      const { data: hrRows, error: hrError } = await admin
        .from("hr_employees")
        .select("line_user_id")
        .in("role", ["hr"])
        .eq("status", "active")
        .not("line_user_id", "is", null);
      if (hrError) throw hrError;

      const targets = (hrRows ?? []).map((r) => r.line_user_id as string);
      for (let i = 0; i < targets.length; i += MULTICAST_LIMIT) {
        const chunk = targets.slice(i, i + MULTICAST_LIMIT);
        const response = await fetch(
          `${lineApiBase}/v2/bot/message/multicast`,
          {
            method: "POST",
            headers: lineHeaders,
            body: JSON.stringify({ to: chunk, messages: [hrMessage] }),
          },
        );
        if (response.ok) hrPushed += chunk.length;
        else {
          console.error(
            `HR multicast failed: ${response.status} ${await response.text()}`,
          );
        }
      }
    }

    return Response.json({
      date: today,
      employees: activeList.length,
      employeePushed,
      hrPushed,
      stats: {
        checkedIn: roster.totals.checkedIn,
        absent: roster.totals.absent,
        late: roster.totals.late,
        leaveCount: roster.totals.onLeave,
      },
    });
  }),
};

export default handler;
