import { LEAVE_TYPE_LABELS, type LeaveType } from "@/features/leave/types"
import { formatThaiDateTime } from "@/lib/datetime/thailand"

export function mapAttendanceQueueItems(
  rows: Array<Record<string, unknown>>
) {
  return rows.map((r) => {
    const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
    return {
      id: r.id as string,
      label: (emp as { name: string })?.name ?? "—",
      meta: `${r.work_date} · ยื่น ${formatThaiDateTime(r.submitted_at as string)}`,
      decidePath: `/api/attendance/submissions/${r.id}/decide`,
    }
  })
}

export function mapLeaveQueueItems(rows: Array<Record<string, unknown>>) {
  return rows.map((r) => {
    const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
    const typeLabel = LEAVE_TYPE_LABELS[r.type as LeaveType] ?? String(r.type)
    const unit =
      r.leave_unit === "hours"
        ? `${r.leave_hours} ชม.`
        : `${r.start_date} – ${r.end_date}`
    return {
      id: r.id as string,
      label: `${(emp as { name: string })?.name ?? "—"} · ${typeLabel}`,
      meta: unit as string,
      decidePath: `/api/leave/${r.id}/decide`,
    }
  })
}

export function mapOvertimeQueueItems(rows: Array<Record<string, unknown>>) {
  return rows.map((r) => {
    const emp = Array.isArray(r.hr_employees) ? r.hr_employees[0] : r.hr_employees
    return {
      id: r.id as string,
      label: (emp as { name: string })?.name ?? "—",
      meta: `${r.work_date} · ${String(r.start_time).slice(0, 5)}–${String(r.end_time).slice(0, 5)}`,
      decidePath: `/api/overtime/${r.id}/decide`,
    }
  })
}
