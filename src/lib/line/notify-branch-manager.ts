import { getAdminClient } from "@/lib/auth/admin-client"
import { pushToLineUser } from "@/lib/line/notify-hr"

export type BranchManagerNotifyKind = "leave" | "attendance" | "overtime"

const KIND_LABEL: Record<BranchManagerNotifyKind, string> = {
  leave: "คำขอลา",
  attendance: "สรุปเข้างานรายวัน",
  overtime: "คำขอ OT",
}

/**
 * Push LINE message to the branch manager of `employeeId`'s branch.
 * Best-effort — logs and returns false on failure (does not throw).
 */
export async function notifyBranchManager({
  employeeId,
  kind,
  employeeName,
  detail,
}: {
  employeeId: string
  kind: BranchManagerNotifyKind
  employeeName: string
  detail?: string
}): Promise<{ pushed: boolean }> {
  try {
    const admin = getAdminClient()

    const { data: employee, error: empErr } = await admin
      .from("hr_employees")
      .select("branch_id")
      .eq("id", employeeId)
      .maybeSingle()

    if (empErr || !employee?.branch_id) {
      return { pushed: false }
    }

    const { data: branch, error: branchErr } = await admin
      .from("hr_branches")
      .select("name, manager_employee_id")
      .eq("id", employee.branch_id as string)
      .maybeSingle()

    if (branchErr || !branch?.manager_employee_id) {
      return { pushed: false }
    }

    const { data: manager, error: mgrErr } = await admin
      .from("hr_employees")
      .select("line_user_id")
      .eq("id", branch.manager_employee_id as string)
      .maybeSingle()

    const lineUserId = manager?.line_user_id as string | null | undefined
    if (mgrErr || !lineUserId) {
      return { pushed: false }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://hr-app-two-iota.vercel.app"
    const path = "/admin/branch"
    const label = KIND_LABEL[kind]

    await pushToLineUser(lineUserId, [
      {
        type: "text",
        text: [
          `📋 ${label}รออนุมัติ`,
          `พนักงาน: ${employeeName}`,
          branch.name ? `สาขา: ${branch.name as string}` : null,
          detail ? `รายละเอียด: ${detail}` : null,
          `อนุมัติภายใน 48 ชม.: ${baseUrl}${path}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ])

    return { pushed: true }
  } catch (error) {
    console.error("notifyBranchManager failed:", error)
    return { pushed: false }
  }
}
