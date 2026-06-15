/** Explicit PostgREST embeds — required after multi-FK columns on approval tables. */

export const EMPLOYEE_VIA_ATTENDANCE_SUBMISSION =
  "hr_employees!hr_attendance_submissions_employee_id_fkey" as const

export const EMPLOYEE_VIA_LEAVE = "hr_employees!hr_leaves_employee_id_fkey" as const

export const EMPLOYEE_VIA_OVERTIME =
  "hr_employees!hr_overtime_requests_employee_id_fkey" as const
