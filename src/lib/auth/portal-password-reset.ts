import type { SupabaseClient } from "@supabase/supabase-js"

import { requiresOfficerPortalPassword } from "@/lib/auth/department-access"

export async function clearPortalPasswordHash(
  admin: SupabaseClient,
  employeeId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data: employee, error: loadError } = await admin
    .from("hr_employees")
    .select("id, department, status")
    .eq("id", employeeId)
    .maybeSingle()

  if (loadError) {
    return { ok: false, error: "โหลดข้อมูลไม่สำเร็จ", status: 500 }
  }
  if (!employee) {
    return { ok: false, error: "ไม่พบพนักงาน", status: 404 }
  }
  if (employee.status !== "active") {
    return { ok: false, error: "พนักงานยังไม่ active", status: 400 }
  }
  if (!requiresOfficerPortalPassword(employee.department as string | null)) {
    return { ok: false, error: "แผนกนี้ไม่ใช้รหัสผ่าน Portal", status: 400 }
  }

  const { error: updateError } = await admin
    .from("hr_employees")
    .update({ portal_password_hash: null })
    .eq("id", employeeId)

  if (updateError) {
    return { ok: false, error: "รีเซ็ตรหัสผ่านไม่สำเร็จ", status: 500 }
  }

  return { ok: true }
}

export async function getPortalPasswordStatus(
  admin: SupabaseClient,
  employeeId: string
): Promise<
  | { requiresPassword: false; hasPassword: false }
  | { requiresPassword: true; hasPassword: boolean }
  | null
> {
  const { data: employee, error } = await admin
    .from("hr_employees")
    .select("department, portal_password_hash")
    .eq("id", employeeId)
    .maybeSingle()

  if (error || !employee) return null

  const requiresPassword = requiresOfficerPortalPassword(
    employee.department as string | null
  )
  if (!requiresPassword) {
    return { requiresPassword: false, hasPassword: false }
  }

  return {
    requiresPassword: true,
    hasPassword: typeof employee.portal_password_hash === "string",
  }
}
