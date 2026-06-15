import type { LeaveType } from "@/features/leave/types"

export const LEAVE_PAGE_SIZE = 20

export type LeaveStatusFilter = "all" | "pending" | "approved" | "rejected"

export type LeaveRequestRow = {
  id: string
  employeeId: string
  employeeName: string
  department: string | null
  type: LeaveType
  startDate: string
  endDate: string
  dayCount: number
  reason: string | null
  attachmentUrl: string | null
  status: "pending" | "approved" | "rejected"
  decisionNote: string | null
  createdAt: string
}
