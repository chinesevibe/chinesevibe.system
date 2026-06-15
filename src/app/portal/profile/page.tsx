import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getEmployeeProfile } from "@/features/employees/profile/data"
import { PortalProfileView } from "@/features/portal/PortalProfileView"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function PortalProfilePage() {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const profile = await getEmployeeProfile(employee.id)
  if (!profile) {
    return (
      <AdminPageShell title="โปรไฟล์" description="ไม่พบข้อมูลพนักงาน">
        <p className="text-sm text-muted-foreground">กรุณาติดต่อ HR</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title="โปรไฟล์"
      description="ข้อมูลพนักงานของคุณ (อ่านอย่างเดียว)"
    >
      <PortalProfileView profile={profile} />
    </AdminPageShell>
  )
}
