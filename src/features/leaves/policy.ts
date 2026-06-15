import { LEAVE_TYPE_LABELS, LEAVE_TYPES, type LeaveType } from "@/features/leave/types"

export type LeavePolicyRow = {
  leaveType: LeaveType
  label: string
  annualDays: number
}

export type EditableEmployeeLeaveBalance = {
  type: LeaveType
  typeLabel: string
  total: number
  used: number
  remaining: number
  policyDefault: number
}

export const EMPTY_LEAVE_POLICIES: LeavePolicyRow[] = LEAVE_TYPES.map((leaveType) => ({
  leaveType,
  label: LEAVE_TYPE_LABELS[leaveType],
  annualDays: 0,
}))
