export const ATTENDANCE_PAGE_SIZE = 20

export type AttendanceStatus = "normal" | "late" | "in_progress"

export type AttendanceRow = {
  id: string
  employeeId: string
  employeeName: string
  department: string | null
  date: string
  checkInAt: string
  checkOutAt: string | null
  checkInText: string
  checkOutText: string
  workHours: number | null
  status: AttendanceStatus
  statusLabel: string
}

export type AttendanceSummary = {
  workDays: number
  totalHours: number
  lateCount: number
}
