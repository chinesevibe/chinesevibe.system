import type { Employee } from "@/lib/auth/session"

export function isPendingRegistration(employee: Employee): boolean {
  return employee.status === "inactive" && employee.role === "employee"
}

export function canUseWorkerFeatures(employee: Employee): boolean {
  return employee.status === "active"
}

export const PENDING_REGISTRATION_PATH = "/register/pending"
export const EMPLOYEE_INFO_PATH = "/employee"
