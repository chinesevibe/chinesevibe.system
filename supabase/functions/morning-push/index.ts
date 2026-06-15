// morning-push: LINE reminder to active employees who have not checked in
// today (ICT). Triggered by pg_cron at 02:00 UTC (09:00 ICT) Mon–Fri via
// pg_net with the secret key — `auth: ["secret"]` rejects everything else.
// Standalone Deno code — no imports from src/ (different runtime).
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const MULTICAST_LIMIT = 500;

function ictDayRangeUtc(now: Date): { start: Date; end: Date } {
  const ictMs = now.getTime() + ICT_OFFSET_MS;
  const dayStartMs = Math.floor(ictMs / 86_400_000) * 86_400_000;
  const start = new Date(dayStartMs - ICT_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const { start, end } = ictDayRangeUtc(new Date());
    const admin = ctx.supabaseAdmin;

    const { data: employees, error: employeesError } = await admin
      .from("hr_employees")
      .select("id, line_user_id")
      .eq("status", "active")
      .not("line_user_id", "is", null);
    if (employeesError) throw employeesError;

    const { data: attendance, error: attendanceError } = await admin
      .from("hr_attendance")
      .select("employee_id")
      .gte("check_in_at", start.toISOString())
      .lt("check_in_at", end.toISOString());
    if (attendanceError) throw attendanceError;

    const checkedIn = new Set(
      (attendance ?? []).map((row) => row.employee_id),
    );
    const targets = (employees ?? [])
      .filter((e) => !checkedIn.has(e.id))
      .map((e) => e.line_user_id as string);

    if (targets.length === 0) {
      return Response.json({ targets: 0, pushed: 0 });
    }

    // LINE_API_BASE is overridable so local tests can hit a mock server.
    const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
    const lineToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
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

    return Response.json({ targets: targets.length, pushed });
  }),
};

export default handler;
