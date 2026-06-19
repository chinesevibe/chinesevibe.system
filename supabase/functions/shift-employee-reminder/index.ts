/**
 * shift-employee-reminder
 * Fires every 5 min via pg_cron.
 *
 * Three reminder types:
 *  A. CHECK-IN  — 5–20 min after shift start, employee hasn't checked in yet
 *  B. CHECK-OUT — 5–30 min after shift end, employee has check-in but no check-out
 *  C. PREV CHECKOUT — when a new shift starts (0–5 min window), employee has
 *     an open attendance from the previous calendar day
 *
 * Dedupe keys stored in hr_runtime_config:
 *   ci_remind_{empId}_{date}_{shiftId}   → type A
 *   co_remind_{empId}_{date}_{shiftId}   → type B
 *   pco_remind_{empId}_{prevDate}        → type C
 */

import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase, type WithSupabaseConfig } from "@supabase/server"
import { ictDateString, type AdminClient } from "../_shared/daily-roster.ts"

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
const LINE_API = "https://api.line.me"

// ── Auth ──────────────────────────────────────────────────────────────────

function authConfig(): WithSupabaseConfig {
  const key =
    Deno.env.get("CRON_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  return key
    ? { auth: ["secret"], env: { secretKeys: { default: key } } }
    : { auth: ["secret"] }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`${name} is not set`)
  return v
}

function ictDayStart(date: string): Date {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d) - ICT_OFFSET_MS)
}

/** Returns minutes elapsed since the UTC timestamp */
function minutesSince(utcMs: number, nowMs: number): number {
  return (nowMs - utcMs) / 60_000
}

async function sendPush(
  lineUserId: string,
  message: Record<string, unknown>,
  token: string
): Promise<boolean> {
  const res = await fetch(`${LINE_API}/v2/bot/message/push`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: lineUserId, messages: [message] }),
  })
  if (!res.ok) {
    console.error(
      `LINE push to ${lineUserId} failed: ${res.status} ${await res.text()}`
    )
  }
  return res.ok
}

function textMsg(text: string): Record<string, unknown> {
  return { type: "text", text }
}

async function isDeduped(
  admin: AdminClient,
  key: string
): Promise<boolean> {
  const { data } = await admin
    .from("hr_runtime_config")
    .select("key")
    .eq("key", key)
    .maybeSingle()
  return !!data
}

async function markDeduped(
  admin: AdminClient,
  key: string,
  value: string
): Promise<void> {
  await admin
    .from("hr_runtime_config")
    .upsert({ key, value })
}

// ── Handler ───────────────────────────────────────────────────────────────

const handler = {
  fetch: withSupabase(authConfig(), async (_req, ctx) => {
    try {
      const now = new Date()
      const nowMs = now.getTime()
      const today = ictDateString(now)
      const yesterday = ictDateString(new Date(nowMs - 24 * 60 * 60 * 1000))
      const admin = ctx.supabaseAdmin
      const lineToken = requireEnv("LINE_CHANNEL_ACCESS_TOKEN")

      // ── Load active shifts ──────────────────────────────────────────────
      const { data: shifts, error: shiftErr } = await admin
        .from("hr_work_shifts")
        .select(
          "id,name,start_hour,start_minute,end_hour,end_minute,crosses_midnight,grace_minutes"
        )
        .eq("is_active", true)

      if (shiftErr) throw shiftErr

      let totalSent = 0

      for (const shift of shifts ?? []) {
        const dayStart = ictDayStart(today)

        // Shift start / end in UTC ms
        const shiftStartMs =
          dayStart.getTime() +
          (shift.start_hour * 60 + shift.start_minute) * 60_000

        const shiftEndMs =
          dayStart.getTime() +
          ((shift.crosses_midnight ? 24 : 0) + shift.end_hour) * 60 * 60_000 +
          shift.end_minute * 60_000

        const minAfterStart = minutesSince(shiftStartMs, nowMs)
        const minAfterEnd = minutesSince(shiftEndMs, nowMs)

        // ── Load employees on this shift ────────────────────────────────
        const { data: employees, error: empErr } = await admin
          .from("hr_employees")
          .select("id, name, line_user_id")
          .eq("work_shift_id", shift.id)
          .eq("status", "active")
          .not("line_user_id", "is", null)

        if (empErr) throw empErr
        if (!employees?.length) continue

        const employeeIds = employees.map((e) => e.id as string)

        // ── Today's attendance records ──────────────────────────────────
        const todayStart = ictDayStart(today)
        const { data: attRows, error: attErr } = await admin
          .from("hr_attendance")
          .select("employee_id, check_in_at, check_out_at")
          .in("employee_id", employeeIds)
          .gte("check_in_at", todayStart.toISOString())
          .lt(
            "check_in_at",
            new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString()
          )

        if (attErr) throw attErr

        const checkedInIds = new Set(
          (attRows ?? []).map((r) => r.employee_id as string)
        )
        const checkedOutIds = new Set(
          (attRows ?? [])
            .filter((r) => r.check_out_at)
            .map((r) => r.employee_id as string)
        )

        // ── Type A: Check-in reminder (5–20 min after shift start) ──────
        if (minAfterStart >= 5 && minAfterStart < 20) {
          for (const emp of employees) {
            if (checkedInIds.has(emp.id as string)) continue
            const key = `ci_remind_${emp.id}_${today}_${shift.id}`
            if (await isDeduped(admin, key)) continue

            const sent = await sendPush(
              emp.line_user_id as string,
              textMsg(
                `⏰ แจ้งเตือน: ยังไม่ได้เช็คอินเข้างาน\n` +
                  `กะ: ${shift.name} (${String(shift.start_hour).padStart(2, "0")}:${String(shift.start_minute).padStart(2, "0")} น.)\n` +
                  `กรุณาเช็คอินผ่าน LINE ด้วยนะครับ/ค่ะ 🙏`
              ),
              lineToken
            )
            if (sent) {
              await markDeduped(admin, key, now.toISOString())
              totalSent++
            }
          }
        }

        // ── Type B: Check-out reminder (5–30 min after shift end) ───────
        if (minAfterEnd >= 5 && minAfterEnd < 30) {
          for (const emp of employees) {
            const empId = emp.id as string
            if (!checkedInIds.has(empId)) continue   // didn't check in
            if (checkedOutIds.has(empId)) continue    // already checked out
            const key = `co_remind_${empId}_${today}_${shift.id}`
            if (await isDeduped(admin, key)) continue

            const sent = await sendPush(
              emp.line_user_id as string,
              textMsg(
                `🚪 แจ้งเตือน: ยังไม่ได้เช็คออกงาน\n` +
                  `กะ: ${shift.name} (สิ้นสุด ${String(shift.end_hour).padStart(2, "0")}:${String(shift.end_minute).padStart(2, "0")} น.)\n` +
                  `กรุณาเช็คออกผ่าน LINE ด้วยนะครับ/ค่ะ 🙏`
              ),
              lineToken
            )
            if (sent) {
              await markDeduped(admin, key, now.toISOString())
              totalSent++
            }
          }
        }

        // ── Type C: Forgot check-out from yesterday (at shift start) ────
        // Window: 0–5 min after today's shift start
        if (minAfterStart >= 0 && minAfterStart < 5) {
          const yesterdayStart = ictDayStart(yesterday)

          const { data: prevAtt, error: prevErr } = await admin
            .from("hr_attendance")
            .select("employee_id")
            .in("employee_id", employeeIds)
            .gte("check_in_at", yesterdayStart.toISOString())
            .lt("check_in_at", todayStart.toISOString())
            .is("check_out_at", null)

          if (prevErr) throw prevErr

          for (const row of prevAtt ?? []) {
            const empId = row.employee_id as string
            const key = `pco_remind_${empId}_${yesterday}`
            if (await isDeduped(admin, key)) continue

            const emp = employees.find((e) => e.id === empId)
            if (!emp?.line_user_id) continue

            const sent = await sendPush(
              emp.line_user_id as string,
              textMsg(
                `⚠️ แจ้งเตือน: ยังไม่ได้เช็คออกงานเมื่อวาน\n` +
                  `กรุณาแจ้ง HR หรือเช็คสถานะการเข้างาน\n` +
                  `(ระบบบันทึกเฉพาะวันที่เช็คออก ถ้าไม่กดอาจถือว่าขาด)`
              ),
              lineToken
            )
            if (sent) {
              await markDeduped(admin, key, now.toISOString())
              totalSent++
            }
          }
        }
      }

      return Response.json({ date: today, totalSent })
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : JSON.stringify(error)
      console.error("shift-employee-reminder failed:", msg)
      return Response.json({ error: msg }, { status: 500 })
    }
  }),
}

export default handler
