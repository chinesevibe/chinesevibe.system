import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { ApprovalQueue } from "@/features/manager/ApprovalQueue"
import {
  getManagerAttendanceQueue,
  getManagerLeaveQueue,
  getManagerOvertimeQueue,
} from "@/features/manager/data"
import {
  mapAttendanceQueueItems,
  mapLeaveQueueItems,
  mapOvertimeQueueItems,
} from "@/features/manager/map-queue-items"
import { requireRole } from "@/lib/auth/require-role"

const HR_QUEUE = "hr" as const

/** คิวอนุมัติขั้นสุดท้ายสำหรับ HR / Admin / Dev */
export default async function HrApprovalQueuePage() {
  const employee = await requireRole("hr", "dev")
  const [attendance, leaves, overtime] = await Promise.all([
    getManagerAttendanceQueue(employee, HR_QUEUE),
    getManagerLeaveQueue(employee, HR_QUEUE),
    getManagerOvertimeQueue(employee, HR_QUEUE),
  ])

  return (
    <AdminPageShell
      title="HR Approval Queue"
      description="อนุมัติลา · OT · เข้างาน — HR Officer (role hr) เท่านั้น"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <ApprovalQueue
          title="สรุปเข้างาน (pending HR)"
          emptyText="ไม่มีคิวรออนุมัติ"
          items={mapAttendanceQueueItems(attendance)}
        />
        <ApprovalQueue
          title="คำขอลา (pending HR)"
          emptyText="ไม่มีคำขอลารออนุมัติ"
          items={mapLeaveQueueItems(leaves)}
        />
        <ApprovalQueue
          title="ขอ OT (pending HR)"
          emptyText="ไม่มีคำขอ OT รออนุมัติ"
          items={mapOvertimeQueueItems(overtime)}
        />
      </div>
    </AdminPageShell>
  )
}
