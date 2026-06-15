// visa-alert: daily check for active employees whose visa_expiry or
// work_permit_expiry is exactly 60/30/14/7/1 days away (ICT). Inserts
// hr_alerts (idempotent per day) and pushes LINE summary to HR.
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const MILESTONE_DAYS = [60, 30, 14, 7, 1];
const MULTICAST_LIMIT = 500;
const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function ictDateString(instant: Date): string {
  return new Date(instant.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

function thaiDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${day} ${THAI_MONTHS[month - 1]}`;
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

type EmployeeRow = {
  id: string;
  name: string;
  visa_expiry: string | null;
  work_permit_expiry: string | null;
};

type AlertCandidate = {
  employeeId: string;
  name: string;
  alertType: "visa_expiry" | "work_permit_expiry";
  triggerDate: string;
};

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const now = new Date();
    const today = ictDateString(now);
    const milestoneDates = MILESTONE_DAYS.map((d) => addDays(today, d));
    const admin = ctx.supabaseAdmin;

    const { data: rows, error: rowsError } = await admin
      .from("hr_employees")
      .select("id, name, visa_expiry, work_permit_expiry")
      .eq("status", "active");
    if (rowsError) throw rowsError;

    const candidates: AlertCandidate[] = [];
    for (const row of (rows ?? []) as EmployeeRow[]) {
      if (row.visa_expiry && milestoneDates.includes(row.visa_expiry)) {
        candidates.push({
          employeeId: row.id,
          name: row.name,
          alertType: "visa_expiry",
          triggerDate: row.visa_expiry,
        });
      }
      if (
        row.work_permit_expiry &&
        milestoneDates.includes(row.work_permit_expiry)
      ) {
        candidates.push({
          employeeId: row.id,
          name: row.name,
          alertType: "work_permit_expiry",
          triggerDate: row.work_permit_expiry,
        });
      }
    }

    if (candidates.length === 0) {
      return Response.json({ candidates: 0, alerts: 0, pushed: 0 });
    }

    const todayStartUtc = new Date(
      Date.parse(`${today}T00:00:00Z`) - ICT_OFFSET_MS,
    ).toISOString();
    const { data: existing, error: existingError } = await admin
      .from("hr_alerts")
      .select("employee_id, alert_type, trigger_date")
      .in("alert_type", ["visa_expiry", "work_permit_expiry"])
      .in("employee_id", [...new Set(candidates.map((c) => c.employeeId))])
      .gte("sent_at", todayStartUtc);
    if (existingError) throw existingError;

    const alreadySent = new Set(
      (existing ?? []).map(
        (row) => `${row.employee_id}|${row.alert_type}|${row.trigger_date}`,
      ),
    );
    const fresh = candidates.filter(
      (c) => !alreadySent.has(`${c.employeeId}|${c.alertType}|${c.triggerDate}`),
    );

    if (fresh.length === 0) {
      return Response.json({
        candidates: candidates.length,
        alerts: 0,
        pushed: 0,
      });
    }

    const { error: insertError } = await admin.from("hr_alerts").insert(
      fresh.map((c) => ({
        employee_id: c.employeeId,
        alert_type: c.alertType,
        trigger_date: c.triggerDate,
        status: "sent",
        sent_at: now.toISOString(),
      })),
    );
    if (insertError) throw insertError;

    const daysLeft = (end: string) =>
      Math.round(
        (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
          DAY_MS,
      );

    const label = (type: AlertCandidate["alertType"]) =>
      type === "visa_expiry" ? "วีซ่า" : "Work Permit";

    const lines = fresh
      .toSorted((a, b) => daysLeft(a.triggerDate) - daysLeft(b.triggerDate))
      .map(
        (c) =>
          `• ${c.name} (${label(c.alertType)} เหลือ ${
            daysLeft(c.triggerDate)
          } วัน — ${thaiDate(c.triggerDate)})`,
      );

    const message = {
      type: "text",
      text: `แจ้งเตือนวีซ่า/Work Permit ใกล้หมดอายุ:\n${lines.join("\n")}`,
    };

    const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
    const lineToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
    const lineHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${lineToken}`,
    };
    let pushed = 0;

    const groupId = Deno.env.get("HR_LINE_GROUP_ID");
    if (groupId) {
      const response = await fetch(`${lineApiBase}/v2/bot/message/push`, {
        method: "POST",
        headers: lineHeaders,
        body: JSON.stringify({ to: groupId, messages: [message] }),
      });
      if (response.ok) pushed = 1;
      else {
        console.error(
          `LINE group push failed: ${response.status} ${await response.text()}`,
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
            body: JSON.stringify({ to: chunk, messages: [message] }),
          },
        );
        if (!response.ok) {
          console.error(
            `LINE multicast failed: ${response.status} ${await response.text()}`,
          );
          continue;
        }
        pushed += chunk.length;
      }
    }

    return Response.json({
      candidates: candidates.length,
      alerts: fresh.length,
      pushed,
    });
  }),
};

export default handler;
