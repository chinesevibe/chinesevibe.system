/** Explicit PostgREST embed — hr_employees ↔ hr_branches has two FK paths. */

export const BRANCH_VIA_EMPLOYEE =
  "hr_branches!hr_employees_branch_id_fkey" as const
