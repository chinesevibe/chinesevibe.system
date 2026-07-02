// evening-summary: weekday 14:10 ICT push —
// HR group aggregate summary only (check-in / absent / late / on-leave)
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, type WithSupabaseConfig } from "@supabase/server";

import { buildDailyRoster, type DailyRosterEmployee } from "../_shared/daily-roster.ts";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const MULTICAST_LIMIT = 500;

function ictDateString(instant: Date): string {
  return new Date(instant.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
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

function formatEmployeeList(
  employees: DailyRosterEmployee[],
  limit = 12,
): string {
  if (employees.length === 0) return "-";
  const items = employees
    .slice(0, limit)
    .map((employee) => `${employee.name} (${employee.employeeCode})`);
  const remainder = employees.length - limit;
  return remainder > 0 ? `${items.join(", ")} และอีก ${remainder} คน` : items.join(", ");
}

const handler = {
  fetch: withSupabase(cronSecretAuthConfig(), async (_req, ctx) => {
    const now = new Date();
    const today = ictDateString(now);
    const admin = ctx.supabaseAdmin;
    const roster = await buildDailyRoster(admin, { date: today, now });

    const { data: employees, error: empError } = await admin
      .from("hr_employees")
      .select("id")
      .eq("status", "active");
    if (empError) throw empError;
    const activeList = employees ?? [];
    const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
    const lineToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
    const lineHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${lineToken}`,
    };
    const employeePushed = 0;

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
        `รายชื่อมาสาย: ${formatEmployeeList(lateEmployees)}`,
        `รายชื่อขาด: ${formatEmployeeList(absentEmployees)}`,
        `รายชื่อลา: ${formatEmployeeList(leaveEmployees)}`,
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
