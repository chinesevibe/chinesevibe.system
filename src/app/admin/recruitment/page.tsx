import Link from "next/link"
import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { WidgetCard } from "@/components/brand/WidgetCard"

export default function AdminRecruitmentPage() {
  return (
    <AdminPageShell
      title="Recruitment"
      description="Lite — ตำแหน่งว่างและ pipeline (T103)"
    >
      <WidgetCard title="Recruitment lite">
        <p className="text-sm text-muted-foreground">
          โมดูลเต็ม (ATS) อยู่นอก scope v1 — ใช้{" "}
          <Link href="/admin/employees/new" className="text-brand-red underline">
            Add Employee
          </Link>{" "}
          สำหรับพนักงานที่จ้างแล้ว หรือ self-register ผ่าน LINE
        </p>
      </WidgetCard>
    </AdminPageShell>
  )
}
