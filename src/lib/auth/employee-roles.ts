import type { Employee } from "@/lib/auth/session"

export const ASSIGNABLE_ROLES = [
  "employee",
  "inventory",
  "hr",
  "branch_manager",
  "dev",
  "ceo",
] as const satisfies readonly Employee["role"][]

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export function isAssignableRole(value: string): value is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value)
}
