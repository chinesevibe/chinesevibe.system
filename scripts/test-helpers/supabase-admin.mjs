import { requireEnv } from "./env.mjs"

export function getSupabaseConfig() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")
}

export async function rest(path, { method = "GET", body, prefer } = {}) {
  const { url, serviceKey } = getSupabaseConfig()
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  }
  if (prefer) headers.Prefer = prefer

  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  return { ok: res.ok, status: res.status, data }
}

export function e2eLineId(suffix) {
  const token = Math.random().toString(36).slice(2, 10)
  return `U_e2e_${suffix}_${token}`
}

export async function insertEmployee(row) {
  const res = await rest("hr_employees", {
    method: "POST",
    body: row,
    prefer: "return=representation",
  })
  if (!res.ok) throw new Error(`insertEmployee: ${JSON.stringify(res.data)}`)
  return Array.isArray(res.data) ? res.data[0] : res.data
}

export async function listE2eEmployees() {
  const res = await rest(
    "hr_employees?select=id,line_user_id&line_user_id=like.U_e2e_*"
  )
  if (!res.ok) throw new Error(`listE2eEmployees: ${JSON.stringify(res.data)}`)
  return res.data ?? []
}

export async function cleanupE2eData() {
  const employees = await listE2eEmployees()
  if (!employees.length) return 0

  const ids = employees.map((e) => e.id).join(",")
  const filter = `employee_id=in.(${ids})`

  await rest(`hr_leaves?${filter}`, { method: "DELETE" })
  await rest(`hr_leave_balances?${filter}`, { method: "DELETE" })
  await rest(`hr_attendance?${filter}`, { method: "DELETE" })
  await rest(`hr_alerts?${filter}`, { method: "DELETE" })
  await rest(`hr_overtime_requests?${filter}`, { method: "DELETE" })
  await rest(`hr_announcements?title=like.E2E*`, { method: "DELETE" })
  const del = await rest(`hr_employees?id=in.(${ids})`, { method: "DELETE" })
  if (!del.ok) throw new Error(`cleanup employees: ${JSON.stringify(del.data)}`)
  return employees.length
}
