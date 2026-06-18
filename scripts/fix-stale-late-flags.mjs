#!/usr/bin/env node
/**
 * Recompute hr_attendance.is_late from employee work shift (fixes Branch Night etc.).
 *
 * Usage:
 *   node --env-file=.env.local scripts/fix-stale-late-flags.mjs
 *   node --env-file=.env.local scripts/fix-stale-late-flags.mjs --date=2026-06-18
 *   node --env-file=.env.local scripts/fix-stale-late-flags.mjs --dry-run
 */
const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function ictDateFromUtc(now = new Date()) {
  const ictMs = now.getTime() + ICT_OFFSET_MS
  const dayStartMs = Math.floor(ictMs / DAY_MS) * DAY_MS
  const d = new Date(dayStartMs)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

function ictDayRange(date) {
  const [year, month, day] = date.split("-").map(Number)
  const start = new Date(Date.UTC(year, month - 1, day) - ICT_OFFSET_MS)
  return { start, end: new Date(start.getTime() + DAY_MS) }
}

function ictDayStartUtc(date) {
  const ictMs = date.getTime() + ICT_OFFSET_MS
  const ictDayStartMs = Math.floor(ictMs / DAY_MS) * DAY_MS
  return new Date(ictDayStartMs - ICT_OFFSET_MS)
}

function lateMinutesForShift(checkInAt, shift) {
  return lateMinutesWithGrace(
    checkInAt,
    shift.start_hour,
    shift.start_minute,
    shift.grace_minutes
  )
}

const DEFAULT_LATE_GRACE_MINUTES = 10

function normalizeTimeToHHMM(value) {
  if (!value) return ""
  const trimmed = String(value).trim()
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(trimmed)
  if (!match) return trimmed
  const hour = Number.parseInt(match[1], 10)
  const minute = match[2]
  if (hour < 0 || hour > 23) return trimmed
  return `${String(hour).padStart(2, "0")}:${minute}`
}

function lateMinutesWithGrace(checkInAt, startHour, startMinute, graceMinutes) {
  const dayStart = ictDayStartUtc(checkInAt)
  const startMinutes = startHour * 60 + startMinute
  const checkInMinutes = Math.floor(
    ((checkInAt.getTime() - dayStart.getTime()) / 60_000 + 24 * 60) % (24 * 60)
  )
  if (checkInMinutes < startMinutes) return 0
  return Math.max(0, checkInMinutes - graceMinutes - startMinutes)
}

function lateMinutesAtCheckIn(checkInAt, shift, defaultCheckInTime) {
  const normalized = normalizeTimeToHHMM(defaultCheckInTime)
  if (normalized) {
    const [hour, minute] = normalized.split(":").map(Number)
    const grace = shift?.grace_minutes ?? DEFAULT_LATE_GRACE_MINUTES
    return lateMinutesWithGrace(checkInAt, hour, minute, grace)
  }
  if (shift) return lateMinutesForShift(checkInAt, shift)
  return 0
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
  process.exit(1)
}

const dryRun = process.argv.includes("--dry-run")
const dateArg = process.argv.find((arg) => arg.startsWith("--date="))
const date = dateArg?.slice("--date=".length) ?? ictDateFromUtc()
const { start, end } = ictDayRange(date)

async function rest(path, options = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${response.status} ${path}: ${body}`)
  }
  if (response.status === 204) return null
  return response.json()
}

const select =
  "id,employee_id,check_in_at,is_late,hr_employees!hr_attendance_employee_id_fkey!inner(default_check_in_time,work_shift_id,hr_work_shifts(start_hour,start_minute,grace_minutes,crosses_midnight))"
const rows = await rest(
  `hr_attendance?select=${encodeURIComponent(select)}&check_in_at=gte.${encodeURIComponent(start.toISOString())}&check_in_at=lt.${encodeURIComponent(end.toISOString())}`
)

let fixed = 0
let checked = 0

for (const row of rows ?? []) {
  checked += 1
  const shift = row.hr_employees?.hr_work_shifts
  const shouldBeLate =
    lateMinutesAtCheckIn(
      new Date(row.check_in_at),
      shift ?? null,
      row.hr_employees?.default_check_in_time ?? null
    ) > 0
  if (!shift && !row.hr_employees?.default_check_in_time) continue
  if (row.is_late === shouldBeLate) continue
  fixed += 1
  console.log(
    `${dryRun ? "[dry-run] " : ""}${row.id} employee=${row.employee_id} is_late ${row.is_late} -> ${shouldBeLate}`
  )
  if (!dryRun) {
    await rest(`hr_attendance?id=eq.${row.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ is_late: shouldBeLate }),
    })
  }
}

console.log(`date=${date} checked=${checked} ${dryRun ? "would_fix" : "fixed"}=${fixed}`)
