// weekly-summary (T50): Monday 08:00 ICT — employee week recap + HR digest
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
function ictDateString(instant: Date): string {
  return new Date(instant.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const now = new Date();
    const end = now;
    const start = new Date(now.getTime() - 7 * 86_400_000);
    const admin = ctx.supabaseAdmin;

    const { data: employees, error: empError } = await admin
      .from("hr_employees")
      .select("id, name, line_user_id")
      .eq("status", "active");
    if (empError) throw empError;

    const { data: attendance, error: attError } = await admin
      .from("hr_attendance")
      .select("employee_id, is_late, work_hours")
      .gte("check_in_at", start.toISOString())
      .lt("check_in_at", end.toISOString());
    if (attError) throw attError;

    const byEmp = new Map<string, { days: number; late: number; hours: number }>();
    for (const row of attendance ?? []) {
      const id = row.employee_id as string;
      const cur = byEmp.get(id) ?? { days: 0, late: 0, hours: 0 };
      cur.days += 1;
      if (row.is_late) cur.late += 1;
      cur.hours += Number(row.work_hours ?? 0);
      byEmp.set(id, cur);
    }

    const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
    const lineToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
    const lineHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${lineToken}`,
    };

    let employeePushed = 0;
    const weekLabel = `${ictDateString(start)} – ${ictDateString(end)}`;

    for (const e of employees ?? []) {
      if (!e.line_user_id) continue;
      const stats = byEmp.get(e.id as string) ?? { days: 0, late: 0, hours: 0 };
      const text = [
        `สรุปเข้างาน 7 วัน (${weekLabel})`,
        e.name as string,
        `วันที่มา: ${stats.days} | มาสาย: ${stats.late}`,
        `รวมชม.ทำงาน: ${stats.hours.toFixed(1)}`,
      ].join("\n");

      const response = await fetch(`${lineApiBase}/v2/bot/message/push`, {
        method: "POST",
        headers: lineHeaders,
        body: JSON.stringify({ to: e.line_user_id, messages: [{ type: "text", text }] }),
      });
      if (response.ok) employeePushed += 1;
    }

    const totalDays = (attendance ?? []).length;
    const totalLate = (attendance ?? []).filter((r) => r.is_late).length;
    const hrMessage = {
      type: "text",
      text: [
        `สรุปเข้างานรายสัปดาห์ (${weekLabel})`,
        `เช็คอินรวม: ${totalDays} ครั้ง`,
        `มาสาย: ${totalLate} ครั้ง`,
        `พนักงาน active: ${(employees ?? []).length} คน`,
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
    }

    return Response.json({ weekLabel, employeePushed, hrPushed, totalDays, totalLate });
  }),
};

export default handler;
