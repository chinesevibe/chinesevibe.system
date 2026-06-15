import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { CountBadge } from "@/components/brand/CountBadge"
import { OvertimeTable } from "@/features/overtime/OvertimeTable"
import { getOvertimeRequests } from "@/features/overtime/data"

export default async function AdminOvertimePage() {
  const { rows, total, pendingCount } = await getOvertimeRequests()

  return (
    <AdminPageShell
      title="Overtime"
      description="คิวคำขอทำงานล่วงเวลา"
      badge={<CountBadge count={pendingCount} label="รออนุมัติ" />}
    >
      <OvertimeTable rows={rows} />
      <p className="mt-4 text-xs text-muted-foreground">ทั้งหมด {total} รายการ</p>
    </AdminPageShell>
  )
}
