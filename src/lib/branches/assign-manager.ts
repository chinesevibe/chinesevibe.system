import type { SupabaseClient } from "@supabase/supabase-js"

type AssignResult = { ok: true } | { ok: false; error: string; status: number }

export async function validateManagerCandidate(
  supabase: SupabaseClient,
  managerEmployeeId: string,
  branchId: string
): Promise<AssignResult> {
  const { data: employee, error } = await supabase
    .from("hr_employees")
    .select("id, status, line_user_id, role")
    .eq("id", managerEmployeeId)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message, status: 500 }
  }
  if (!employee) {
    return { ok: false, error: "ไม่พบพนักงาน", status: 404 }
  }
  if (employee.status !== "active") {
    return {
      ok: false,
      error: "เลือกได้เฉพาะพนักงานที่ลงทะเบียนและอนุมัติแล้ว",
      status: 400,
    }
  }
  if (!employee.line_user_id) {
    return {
      ok: false,
      error: "พนักงานยังไม่ได้ลงทะเบียนผ่าน LINE",
      status: 400,
    }
  }
  if (employee.role === "ceo" || employee.role === "dev") {
    return { ok: false, error: "ไม่สามารถมอบหมาย role นี้เป็นผู้ดูแลสาขา", status: 400 }
  }

  const { data: existing } = await supabase
    .from("hr_branches")
    .select("id")
    .eq("manager_employee_id", managerEmployeeId)
    .neq("id", branchId)
    .maybeSingle()

  if (existing) {
    return {
      ok: false,
      error: "พนักงานนี้เป็นผู้ดูแลสาขาอื่นอยู่แล้ว",
      status: 409,
    }
  }

  return { ok: true }
}

export async function applyBranchManagerAssignment(
  supabase: SupabaseClient,
  branchId: string,
  managerEmployeeId: string | null,
  previousManagerId: string | null = null
) {
  if (managerEmployeeId) {
    const validation = await validateManagerCandidate(supabase, managerEmployeeId, branchId)
    if (!validation.ok) return validation

    await supabase
      .from("hr_employees")
      .update({ role: "branch_manager", branch_id: branchId })
      .eq("id", managerEmployeeId)
  }

  if (
    previousManagerId &&
    previousManagerId !== managerEmployeeId
  ) {
    const { data: previous } = await supabase
      .from("hr_employees")
      .select("role")
      .eq("id", previousManagerId)
      .maybeSingle()

    if (previous?.role === "branch_manager") {
      await supabase
        .from("hr_employees")
        .update({ role: "employee" })
        .eq("id", previousManagerId)
    }
  }

  return { ok: true as const }
}
