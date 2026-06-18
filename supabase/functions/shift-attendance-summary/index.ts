import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, type WithSupabaseConfig } from "@supabase/server";

import {
  type AdminClient,
  buildDailyRoster,
  formatNameList,
  ictDateString,
  UNASSIGNED_SHIFT_ID,
} from "../_shared/daily-roster.ts";

const MULTICAST_LIMIT = 500;

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

function ictWeekday(date: Date): number {
  const ictMs = date.getTime() + 7 * 60 * 60 * 1000;
  return new Date(ictMs).getUTCDay();
}

async function pushHrMessage(
  admin: AdminClient,
  lineHeaders: Record<string, string>,
  message: { type: "text"; text: string },
): Promise<number> {
  const lineApiBase = Deno.env.get("LINE_API_BASE") ?? "https://api.line.me";
  const groupId = Deno.env.get("HR_LINE_GROUP_ID");

  if (groupId) {
    const response = await fetch(`${lineApiBase}/v2/bot/message/push`, {
      method: "POST",
      headers: lineHeaders,
      body: JSON.stringify({ to: groupId, messages: [message] }),
    });
    if (!response.ok) {
      console.error(`HR group push failed: ${response.status} ${await response.text()}`);
      return 0;
    }
    return 1;
  }

  const { data: hrRows, error } = await admin
    .from("hr_employees")
    .select("line_user_id")
    .in("role", ["hr"])
    .eq("status", "active")
    .not("line_user_id", "is", null);
  if (error) throw error;

  let pushed = 0;
  const targets = (hrRows ?? []).map((row) => row.line_user_id as string);
  for (let index = 0; index < targets.length; index += MULTICAST_LIMIT) {
    const chunk = targets.slice(index, index + MULTICAST_LIMIT);
    const response = await fetch(`${lineApiBase}/v2/bot/message/multicast`, {
      method: "POST",
      headers: lineHeaders,
      body: JSON.stringify({ to: chunk, messages: [message] }),
    });
    if (response.ok) pushed += chunk.length;
    else {
      console.error(`HR multicast failed: ${response.status} ${await response.text()}`);
    }
  }
  return pushed;
}

const handler = {
  fetch: withSupabase(cronSecretAuthConfig(), async (_req, ctx) => {
    try {
      const now = new Date();
      const weekday = ictWeekday(now);
      if (weekday === 0 || weekday === 6) {
        return Response.json({ skipped: true, reason: "weekend" });
      }

      const admin = ctx.supabaseAdmin;
      const today = ictDateString(now);
      const roster = await buildDailyRoster(admin, { date: today, now });
      const lineToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
      const lineHeaders = {
        "content-type": "application/json",
        authorization: `Bearer ${lineToken}`,
      };

      const dueGroups = roster.groups.filter((group) => {
        if (group.id === UNASSIGNED_SHIFT_ID || !group.graceAt) return false;
        const graceAt = new Date(group.graceAt);
        const diffMs = now.getTime() - graceAt.getTime();
        return diffMs >= 0 && diffMs < 15 * 60 * 1000;
      });

      if (dueGroups.length === 0) {
        return Response.json({ date: today, pushed: 0, reason: "no_due_shift" });
      }

      const dedupeKeys = dueGroups.map((group) => `shift_summary_last_push_${group.id}_${today}`);
      const { data: existingRows, error: existingError } = await admin
        .from("hr_runtime_config")
        .select("key, value")
        .in("key", dedupeKeys);
      if (existingError) throw existingError;
      const existingKeys = new Set((existingRows ?? []).map((row) => row.key as string));

      const sent: string[] = [];
      for (const group of dueGroups) {
        const dedupeKey = `shift_summary_last_push_${group.id}_${today}`;
        if (existingKeys.has(dedupeKey)) continue;

        const lateEmployees = group.employees.filter((employee) => employee.status === "late");
        const absentEmployees = group.employees.filter((employee) => employee.status === "absent");
        const leaveEmployees = group.employees.filter((employee) => employee.status === "on_leave");

        const pushed = await pushHrMessage(admin, lineHeaders, {
          type: "text",
          text: [
            `อัปเดต attendance รายกะ ${today}`,
            `${group.name} • ${group.timeRange}`,
            `เช็คอินแล้ว: ${group.totals.checkedIn}/${group.totals.total} คน`,
            `มาสาย (${lateEmployees.length}): ${formatNameList(lateEmployees)}`,
            `ขาด (${absentEmployees.length}): ${formatNameList(absentEmployees)}`,
            `ลา (${leaveEmployees.length}): ${formatNameList(leaveEmployees)}`,
          ].join("\n"),
        });

        if (pushed > 0) {
          const { error: upsertError } = await admin
            .from("hr_runtime_config")
            .upsert({ key: dedupeKey, value: now.toISOString() });
          if (upsertError) throw upsertError;
          sent.push(group.id);
        }
      }

      return Response.json({ date: today, pushed: sent.length, shifts: sent });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error);
      console.error("shift-attendance-summary failed:", message);
      return Response.json({ error: message }, { status: 500 });
    }
  }),
};

export default handler;
