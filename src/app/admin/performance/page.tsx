import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { WidgetCard } from "@/components/brand/WidgetCard"

export default function AdminPerformancePage() {
  return (
    <AdminPageShell
      title="Performance"
      description="Lite — รอบประเมินผล (T105)"
    >
      <WidgetCard title="Performance reviews">
        <p className="text-sm text-muted-foreground">
          360 / review cycle อยู่นอก scope v1 — ใช้ probation workflow ใน employee
          profile สำหรับช่วงทดลองงาน
        </p>
      </WidgetCard>
    </AdminPageShell>
  )
}
