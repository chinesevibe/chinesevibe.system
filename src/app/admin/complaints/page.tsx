import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { CountBadge } from "@/components/brand/CountBadge"
import { ComplaintTable } from "@/features/complaints/ComplaintTable"
import {
  getComplaints,
  normalizeComplaintParams,
} from "@/features/complaints/data"

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const raw = await searchParams
  const params = normalizeComplaintParams(raw)
  const { rows, total, openCount } = await getComplaints(params)

  return (
    <AdminPageShell
      title="Complaints"
      description="คิวเรื่องร้องเรียนและข้อเสนอแนะ"
      badge={<CountBadge count={openCount} label="เปิดอยู่" />}
    >
      <ComplaintTable rows={rows} />
      <p className="mt-4 text-xs text-muted-foreground">
        ทั้งหมด {total} รายการ
      </p>
    </AdminPageShell>
  )
}
