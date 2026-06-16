import { getAdminClient } from "@/lib/auth/admin-client"
import {
  canRelinkLineUserId,
  isRealLineId,
} from "@/lib/auth/line-user-id"

export type LinkLineEmployeeResult =
  | { ok: true; employeeId: string; alreadyLinked: boolean; employeeName: string }
  | { ok: false; error: string; status: number }

type EmployeeLinkRow = {
  id: string
  name: string
  line_user_id: string | null
}

async function findEmployeeByCode(employeeCode: string) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_employees")
    .select("id, name, line_user_id, status")
    .ilike("employee_code", employeeCode.trim())
    .maybeSingle()

  if (error) {
    console.error("link-line employee lookup failed", error)
    return null
  }
  return data as {
    id: string
    name: string
    line_user_id: string | null
    status: string
  } | null
}

async function lineIdTakenByOther(
  realLineUserId: string,
  employeeId: string
): Promise<boolean> {
  const admin = getAdminClient()
  const { data } = await admin
    .from("hr_employees")
    .select("id")
    .eq("line_user_id", realLineUserId)
    .maybeSingle()

  return Boolean(data && data.id !== employeeId)
}

export async function linkLineEmployeeByCode(
  realLineUserId: string,
  employeeCode: string
): Promise<LinkLineEmployeeResult> {
  if (!isRealLineId(realLineUserId)) {
    return { ok: false, error: "invalid line user", status: 400 }
  }

  const employee = await findEmployeeByCode(employeeCode)
  if (!employee) {
    return { ok: false, error: "employee not found", status: 404 }
  }

  return linkLineEmployeeById(realLineUserId, employee.id, employee)
}

export async function linkLineEmployeeById(
  realLineUserId: string,
  employeeId: string,
  existing?: EmployeeLinkRow
): Promise<LinkLineEmployeeResult> {
  if (!isRealLineId(realLineUserId)) {
    return { ok: false, error: "invalid line user", status: 400 }
  }

  const admin = getAdminClient()
  let employee: EmployeeLinkRow | null = existing ?? null

  if (!employee) {
    const { data, error } = await admin
      .from("hr_employees")
      .select("id, name, line_user_id")
      .eq("id", employeeId)
      .maybeSingle()

    if (error || !data) {
      return { ok: false, error: "employee not found", status: 404 }
    }
    employee = data as EmployeeLinkRow
  }

  const currentLineId = employee.line_user_id

  if (currentLineId === realLineUserId) {
    return {
      ok: true,
      employeeId: employee.id,
      alreadyLinked: true,
      employeeName: employee.name,
    }
  }

  if (!canRelinkLineUserId(currentLineId)) {
    return {
      ok: false,
      error: "employee already linked to another LINE account",
      status: 409,
    }
  }

  if (await lineIdTakenByOther(realLineUserId, employee.id)) {
    return {
      ok: false,
      error: "LINE account already linked to another employee",
      status: 409,
    }
  }

  const { error: updateError } = await admin
    .from("hr_employees")
    .update({ line_user_id: realLineUserId })
    .eq("id", employee.id)

  if (updateError) {
    console.error("link-line update failed", updateError)
    return { ok: false, error: "link failed", status: 500 }
  }

  return {
    ok: true,
    employeeId: employee.id,
    alreadyLinked: false,
    employeeName: employee.name,
  }
}

/** Plain employee code in chat (not a slash command). */
export function looksLikeEmployeeCode(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || trimmed.startsWith("/")) return false
  return /^[A-Za-z0-9_-]{2,20}$/.test(trimmed)
}
