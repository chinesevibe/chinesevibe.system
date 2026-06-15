import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { AnnouncementComposeForm } from "@/features/announcements/AnnouncementComposeForm"
import { AnnouncementTable } from "@/features/announcements/AnnouncementTable"
import { getAnnouncements } from "@/features/announcements/data"
import { createClient } from "@/lib/supabase/server"

export default async function AdminAnnouncementsPage() {
  const rows = await getAnnouncements()

  const supabase = await createClient()
  const { data: deptRows } = await supabase
    .from("hr_employees")
    .select("department")
    .not("department", "is", null)

  const departments = [
    ...new Set(
      (deptRows ?? [])
        .map((r) => r.department as string)
        .filter(Boolean)
    ),
  ].sort()

  return (
    <AdminPageShell
      title="ประกาศ"
      description="สร้างและส่งประกาศให้พนักงานทาง LINE — พนักงานรับ push ในแชท (ไม่มีปุ่มประกาศใน Rich Menu)"
    >
      <div className="flex flex-col gap-6">
        <AnnouncementComposeForm departments={departments} />
        <AnnouncementTable rows={rows} />
      </div>
    </AdminPageShell>
  )
}
