import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { WidgetCard } from "@/components/brand/WidgetCard"

export default function AdminTrainingPage() {
  return (
    <AdminPageShell
      title="Training"
      description="Lite — ทะเบียนหลักสูตร (T104)"
    >
      <WidgetCard title="Training registry">
        <p className="text-sm text-muted-foreground">
          ยังไม่มีตารางหลักสูตรใน v1 — บันทึกการอบรมชั่วคราวใน employee profile
          หรือ compliance notes
        </p>
      </WidgetCard>
    </AdminPageShell>
  )
}
