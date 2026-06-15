// monthly-summary (T51): 1st of month 08:00 ICT — employee month recap
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

function ictParts(instant: Date) {
  const ict = new Date(instant.getTime() + ICT_OFFSET_MS);
  return { year: ict.getUTCFullYear(), month: ict.getUTCMonth() };
}

function monthRangeUtc(now: Date): { start: Date; end: Date; label: string } {
  const { year, month } = ictParts(now);
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const startIct = Date.UTC(prevYear, prevMonth, 1);
  const endIct = Date.UTC(year, month, 1);
  const start = new Date(startIct - ICT_OFFSET_MS);
  const end = new Date(endIct - ICT_OFFSET_MS);
  const label = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}`;
  return { start, end, label };
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const now = new Date();
    const { start, end, label } = monthRangeUtc(now);
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

    let pushed = 0;
    for (const e of employees ?? []) {
      if (!e.line_user_id) continue;
      const stats = byEmp.get(e.id as string) ?? { days: 0, late: 0, hours: 0 };
      const text = [
        `สรุปเข้างานเดือน ${label}`,
        e.name as string,
        `วันที่มา: ${stats.days} | มาสาย: ${stats.late}`,
        `รวมชม.ทำงาน: ${stats.hours.toFixed(1)}`,
      ].join("\n");

      const response = await fetch(`${lineApiBase}/v2/bot/message/push`, {
        method: "POST",
        headers: lineHeaders,
        body: JSON.stringify({ to: e.line_user_id, messages: [{ type: "text", text }] }),
      });
      if (response.ok) pushed += 1;
    }

    return Response.json({ month: label, pushed, records: (attendance ?? []).length });
  }),
};

export default handler;
