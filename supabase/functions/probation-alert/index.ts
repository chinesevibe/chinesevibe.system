// probation-alert: daily check for active employees whose probation_end is
// exactly 30/14/7/1 days away (ICT). Inserts hr_alerts (idempotent per day)
// and pushes a LINE summary to HR — HR_LINE_GROUP_ID if set, otherwise
// multicast to hr/admin users. Triggered by pg_cron at 02:30 UTC (09:30 ICT)
// daily via pg_net with the secret key — `auth: ["secret"]` rejects the rest.
// Standalone Deno code — no imports from src/ (different runtime).
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const MILESTONE_DAYS = [30, 14, 7, 1];
const MULTICAST_LIMIT = 500;
const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

// "YYYY-MM-DD" of the ICT day containing `instant`.
function ictDateString(instant: Date): string {
  return new Date(instant.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS;
  return new Date(t).toISOString().slice(0, 10);
}

// "17 มิ.ย." for user-facing messages.
function thaiDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${day} ${THAI_MONTHS[month - 1]}`;
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

type Candidate = {
  id: string;
  name: string;
  probation_end: string;
};

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const now = new Date();
    const today = ictDateString(now);
    const milestoneDates = MILESTONE_DAYS.map((d) => addDays(today, d));
    const admin = ctx.supabaseAdmin;

    const { data: candidateRows, error: candidatesError } = await admin
      .from("hr_employees")
      .select("id, name, probation_end")
      .eq("status", "active")
      .in("probation_end", milestoneDates);
    if (candidatesError) throw candidatesError;

    const candidates = (candidateRows ?? []) as Candidate[];
    if (candidates.length === 0) {
      return Response.json({ candidates: 0, alerts: 0, pushed: 0 });
    }

    // Idempotency: skip anyone already alerted today (ICT) for the same
    // probation_end — a re-run within the day inserts and pushes nothing.
    const todayStartUtc = new Date(
      Date.parse(`${today}T00:00:00Z`) - ICT_OFFSET_MS,
    ).toISOString();
    const { data: existing, error: existingError } = await admin
      .from("hr_alerts")
      .select("employee_id, trigger_date")
      .eq("alert_type", "probation_end")
      .in("employee_id", candidates.map((c) => c.id))
      .gte("sent_at", todayStartUtc);
    if (existingError) throw existingError;

    const alreadySent = new Set(
      (existing ?? []).map((row) => `${row.employee_id}|${row.trigger_date}`),
    );
    const fresh = candidates.filter(
      (c) => !alreadySent.has(`${c.id}|${c.probation_end}`),
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
        employee_id: c.id,
        alert_type: "probation_end",
        trigger_date: c.probation_end,
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
    const lines = fresh
      .toSorted((a, b) => daysLeft(a.probation_end) - daysLeft(b.probation_end))
      .map((c) =>
        `• ${c.name} (เหลือ ${daysLeft(c.probation_end)} วัน — ${
          thaiDate(c.probation_end)
        })`
      );
    const message = {
      type: "text",
      text: `แจ้งเตือนโปรเบชั่นใกล้ครบกำหนด:\n${lines.join("\n")}`,
    };

    // LINE_API_BASE is overridable so local tests can hit a mock server.
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
      if (response.ok) {
        pushed = 1;
      } else {
        console.error(
          `LINE group push failed: ${response.status} ${await response
            .text()}`,
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
      if (targets.length === 0) {
        console.warn(
          "probation-alert: no HR_LINE_GROUP_ID and no hr/admin with line_user_id — nothing pushed",
        );
      }
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
            `LINE multicast failed: ${response.status} ${await response
              .text()}`,
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
