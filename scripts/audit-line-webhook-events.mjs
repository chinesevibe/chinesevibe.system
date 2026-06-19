import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

function loadEnv(path) {
  const raw = readFileSync(path, "utf8")
  const env = {}
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx === -1) continue
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1)
  }
  return env
}

function ictDateRange() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const today = fmt.format(new Date())
  return today
}

function hasLocation(raw) {
  return Boolean(
    raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      Number.isFinite(Number(raw.latitude)) &&
      Number.isFinite(Number(raw.longitude))
  )
}

function describeLatestLog(log) {
  if (!log) return "no-log"
  if (log.message_text) return `text=${JSON.stringify(log.message_text)}`
  if (hasLocation(log.location_payload)) {
    return `location=${JSON.stringify({
      latitude: log.location_payload.latitude,
      longitude: log.location_payload.longitude,
      address: log.location_payload.address ?? null,
    })}`
  }
  return log.event_type
}

const env = loadEnv(new URL("../.env.local", import.meta.url).pathname)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const date = ictDateRange()
const shiftName = "Branch Night 14:00–02:00"

const { data: shiftRows, error: shiftError } = await supabase
  .from("hr_work_shifts")
  .select("id,name")
  .eq("name", shiftName)
  .limit(1)

if (shiftError) throw shiftError
const shiftId = shiftRows?.[0]?.id
if (!shiftId) throw new Error(`ไม่พบกะ ${shiftName}`)

const { data: employees, error: empError } = await supabase
  .from("hr_employees")
  .select("id, employee_code, name, line_user_id")
  .eq("work_shift_id", shiftId)
  .eq("status", "active")

if (empError) throw empError

const employeeIds = (employees ?? []).map((row) => row.id)

if (employeeIds.length === 0) {
  console.log(`date=${date} shift=${shiftName}`)
  process.exit(0)
}

const [logRes, attRes] = await Promise.all([
  supabase
    .from("hr_line_webhook_events")
    .select("id, received_at, event_type, line_user_id, employee_id, employee_code, employee_name, message_type, message_text, location_payload")
    .gte("received_at", `${date}T00:00:00+07:00`)
    .lt("received_at", `${date}T23:59:59.999+07:00`)
    .order("received_at", { ascending: false }),
  supabase
    .from("hr_attendance")
    .select("employee_id, check_in_at, check_in_location, check_out_at, created_at, shift_date")
    .eq("shift_date", date)
    .in("employee_id", employeeIds),
])

if (logRes.error) throw logRes.error
if (attRes.error) throw attRes.error

const logsByEmp = new Map()
const logsByLineUserId = new Map()
for (const row of logRes.data ?? []) {
  if (row.employee_id) {
    const list = logsByEmp.get(row.employee_id) ?? []
    list.push(row)
    logsByEmp.set(row.employee_id, list)
  }
  if (row.line_user_id) {
    const list = logsByLineUserId.get(row.line_user_id) ?? []
    list.push(row)
    logsByLineUserId.set(row.line_user_id, list)
  }
}

const attByEmp = new Map()
for (const row of attRes.data ?? []) {
  attByEmp.set(row.employee_id, row)
}

const sorted = [...(employees ?? [])].sort((a, b) =>
  String(a.employee_code ?? "").localeCompare(String(b.employee_code ?? ""))
)

console.log(`date=${date} shift=${shiftName}`)
for (const emp of sorted) {
  const logs = logsByEmp.get(emp.id) ?? (emp.line_user_id ? logsByLineUserId.get(emp.line_user_id) ?? [] : [])
  const att = attByEmp.get(emp.id)
  const locationShared = Boolean(att && hasLocation(att.check_in_location))
  const latestLog = logs[0]
  console.log(
    `${emp.employee_code ?? "-"}\t${emp.name}\tchat=${logs.length}\tlatest=${describeLatestLog(latestLog)}\tattendance=${locationShared ? "shared" : "no-location"}`
  )
}
