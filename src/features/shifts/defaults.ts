import type { AssignableRole } from "@/lib/auth/employee-roles"

import { WORK_SHIFT_CODES, type WorkShiftCode } from "./types"

/** Head Office departments → Office shift */
const OFFICE_DEPARTMENTS = new Set([
  "Management",
  "HR Officer",
  "IT",
  "Admin",
  "Accounting",
  "Inventory",
])

/**
 * Suggested default shift when HR creates/edits an employee (Phase 2 UI).
 * Does not auto-assign in DB until Phase 2.
 */
export function suggestWorkShiftCode(input: {
  role: AssignableRole | string
  department: string | null | undefined
  branchId: string | null | undefined
}): WorkShiftCode {
  const role = input.role
  const department = input.department?.trim() ?? ""

  if (role === "branch_manager") {
    return WORK_SHIFT_CODES.BRANCH_MGR
  }

  if (OFFICE_DEPARTMENTS.has(department) || role === "hr" || role === "inventory" || role === "ceo") {
    return WORK_SHIFT_CODES.OFFICE
  }

  if (input.branchId) {
    return WORK_SHIFT_CODES.BRANCH_DAY
  }

  return WORK_SHIFT_CODES.OFFICE
}
