import { getAdminClient } from "@/lib/auth/admin-client"
import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"
import { registrationPendingFlex } from "@/lib/line/flex/registration-pending"
import { notifyHr, pushToLineUser } from "@/lib/line/notify-hr"

/**
 * Notify HR LINE group + individual HR/admin/dev when a worker self-registers.
 * Best-effort — never throws to caller.
 */
export async function notifyRegistrationPending(
  employeeId: string
): Promise<void> {
  try {
    const admin = getAdminClient()

    const { data: employee, error } = await admin
      .from("hr_employees")
      .select(
        `id, employee_code, name, phone, department, position, branch_id, ${BRANCH_VIA_EMPLOYEE}(name)`
      )
      .eq("id", employeeId)
      .maybeSingle()

    if (error || !employee) {
      console.error("notifyRegistrationPending: employee not found", error)
      return
    }

    const branchJoin = employee.hr_branches as { name: string } | { name: string }[] | null
    const branchName = Array.isArray(branchJoin)
      ? branchJoin[0]?.name
      : branchJoin?.name

    const flex = registrationPendingFlex({
      employeeId,
      employeeCode: employee.employee_code as string | null,
      name: employee.name as string,
      phone: employee.phone as string | null,
      branchName: branchName ?? null,
      department: employee.department as string | null,
      position: employee.position as string | null,
    })

    const textSummary = {
      type: "text" as const,
      text: [
        "📝 พนักงานใหม่ลงทะเบียน (รออนุมัติ)",
        employee.employee_code
          ? `รหัส: ${employee.employee_code}`
          : null,
        `ชื่อ: ${employee.name}`,
        employee.phone ? `เบอร์: ${employee.phone}` : null,
        branchName ? `สาขา: ${branchName}` : null,
        "กดอนุมัติ/ปฏิเสธใน Flex ด้านล่าง หรือเปิด Dashboard",
      ]
        .filter(Boolean)
        .join("\n"),
    }

    await notifyHr([textSummary, flex])

    const { data: hrRows } = await admin
      .from("hr_employees")
      .select("line_user_id")
      .in("role", ["hr", "admin", "dev"])
      .eq("status", "active")
      .not("line_user_id", "is", null)

    const seen = new Set<string>()
    for (const row of hrRows ?? []) {
      const uid = row.line_user_id as string
      if (seen.has(uid)) continue
      seen.add(uid)
      try {
        await pushToLineUser(uid, [flex])
      } catch (e) {
        console.error("notifyRegistrationPending push hr failed:", uid, e)
      }
    }
  } catch (e) {
    console.error("notifyRegistrationPending failed:", e)
  }
}
