import type { AnnouncementRow } from "@/features/announcements/data"
import { announcementImagePublicUrl } from "@/lib/announcements/image"
import type { LeaveBalance } from "@/features/leave/LeaveBalanceCard"
import {
  DOC_TYPE_LABELS,
  type DocStatus,
  type DocType,
} from "@/features/documents/types"
import { formatIctTime } from "@/lib/attendance/late"
import {
  autoCloseOpenAttendanceSessions,
  sessionCycleStartUtc,
} from "@/lib/attendance/session-cycle"
import { createClient } from "@/lib/supabase/server"

export type TodayAttendanceStatus =
  | { checkedIn: false }
  | {
      checkedIn: true
      checkInAt: string
      checkInText: string
      checkOutAt: string | null
      checkOutText: string | null
      isLate: boolean
      workHours: number | null
      inProgress: boolean
    }

export type EmployeeDocumentRow = {
  id: string
  docType: DocType
  copies: number
  purpose: string
  status: DocStatus
  hrNote: string | null
  resultFileUrl: string | null
  createdAt: string
}

export async function getTodayAttendanceStatus(
  employeeId: string
): Promise<TodayAttendanceStatus> {
  const supabase = await createClient()
  const now = new Date()
  await autoCloseOpenAttendanceSessions({ employeeId, now })
  const cycleStart = sessionCycleStartUtc(now)

  const { data, error } = await supabase
    .from("hr_attendance")
    .select("check_in_at, check_out_at, is_late, work_hours")
    .eq("employee_id", employeeId)
    .gte("check_in_at", cycleStart.toISOString())
    .lte("check_in_at", now.toISOString())
    .order("check_in_at", { ascending: false })
    .maybeSingle()

  if (error) throw error
  if (!data) return { checkedIn: false }

  const checkInAt = new Date(data.check_in_at)
  const checkOutAt = data.check_out_at ? new Date(data.check_out_at) : null
  const inProgress = !checkOutAt

  return {
    checkedIn: true,
    checkInAt: data.check_in_at,
    checkInText: formatIctTime(checkInAt),
    checkOutAt: data.check_out_at,
    checkOutText: checkOutAt ? formatIctTime(checkOutAt) : null,
    isLate: data.is_late,
    workHours: data.work_hours,
    inProgress,
  }
}

export async function getEmployeeLeaveBalances(
  employeeId: string
): Promise<LeaveBalance[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_leave_balances")
    .select("leave_type, total_days, used_days")
    .eq("employee_id", employeeId)

  if (error) throw error
  return (data ?? []) as LeaveBalance[]
}

export async function getEmployeeAnnouncements(
  department: string | null
): Promise<AnnouncementRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_announcements")
    .select(
      "id, title, body, image_path, target_type, target_value, status, sent_at, created_at"
    )
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(20)

  if (error) throw error

  type RawRow = {
    id: string
    title: string
    body: string
    image_path: string | null
    target_type: string
    target_value: string | null
    status: string
    sent_at: string | null
    created_at: string
  }

  const rows = ((data ?? []) as RawRow[])
    .filter((row) => {
      if (row.target_type === "all") return true
      if (row.target_type === "department" && department) {
        return row.target_value === department
      }
      return false
    })
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      imagePath: row.image_path,
      imageUrl: announcementImagePublicUrl(row.image_path),
      targetType: row.target_type as AnnouncementRow["targetType"],
      targetValue: row.target_value,
      status: row.status as AnnouncementRow["status"],
      sentAt: row.sent_at,
      createdAt: row.created_at,
    }))

  return rows
}

export async function getEmployeeDocumentRequests(
  employeeId: string
): Promise<EmployeeDocumentRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_document_requests")
    .select(
      "id, doc_type, copies, purpose, status, hr_note, result_file_url, created_at"
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id as string,
    docType: row.doc_type as DocType,
    copies: row.copies as number,
    purpose: row.purpose as string,
    status: row.status as DocStatus,
    hrNote: row.hr_note as string | null,
    resultFileUrl: row.result_file_url as string | null,
    createdAt: row.created_at as string,
  }))
}

export { DOC_TYPE_LABELS }
