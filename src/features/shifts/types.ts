export const WORK_SHIFT_CODES = {
  OFFICE: "OFFICE",
  BRANCH_MGR: "BRANCH_MGR",
  BRANCH_DAY: "BRANCH_DAY",
  BRANCH_NIGHT: "BRANCH_NIGHT",
} as const

export type WorkShiftCode = (typeof WORK_SHIFT_CODES)[keyof typeof WORK_SHIFT_CODES]

export type WorkShift = {
  id: string
  code: string
  name: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  crosses_midnight: boolean
  grace_minutes: number
  standard_hours: number
  check_in_early_minutes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type WorkShiftSummary = Pick<
  WorkShift,
  | "id"
  | "code"
  | "name"
  | "start_hour"
  | "start_minute"
  | "end_hour"
  | "end_minute"
  | "crosses_midnight"
  | "grace_minutes"
  | "standard_hours"
  | "is_active"
>
