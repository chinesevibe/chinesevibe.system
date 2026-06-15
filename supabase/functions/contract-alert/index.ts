// contract-alert (T72): contract_end milestones 60/30/14/7/1 days (ICT)
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const MILESTONE_DAYS = [60, 30, 14, 7, 1];

function ictDateString(instant: Date): string {
  return new Date(instant.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const today = ictDateString(new Date());
    const milestones = new Set(MILESTONE_DAYS.map((d) => addDays(today, d)));
    const admin = ctx.supabaseAdmin;

    const { data: rows, error } = await admin
      .from("hr_employees")
      .select("id, name, contract_end")
      .eq("status", "active")
      .not("contract_end", "is", null);
    if (error) throw error;

    let created = 0;
    for (const row of rows ?? []) {
      const end = row.contract_end as string;
      if (!milestones.has(end)) continue;

      const { error: insErr } = await admin.from("hr_alerts").insert({
        employee_id: row.id,
        alert_type: "contract_expiry",
        trigger_date: today,
        status: "pending",
      });
      if (!insErr) created += 1;
    }

    return Response.json({ today, checked: (rows ?? []).length, alertsCreated: created });
  }),
};

export default handler;
