import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { DepartmentManager } from "@/features/organization/DepartmentManager"
import { getOrganizationTree } from "@/features/organization/data"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function AdminOrganizationPage() {
  const employee = await getCurrentEmployee()
  const canManage = employee ? canManageHr(employee.role) : false
  const rows = await getOrganizationTree()

  return (
    <AdminPageShell
      title="Organization"
      description="จัดการแผนกและตำแหน่ง — แยกตามแผนก ใช้ใน dropdown ตอนเพิ่มพนักงาน"
    >
      <DepartmentManager rows={rows} canManage={canManage} />
    </AdminPageShell>
  )
}
