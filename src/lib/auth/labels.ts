import type { Employee } from "@/lib/auth/session"

export function roleDisplayLabel(role: Employee["role"]): string {
  if (role === "dev") return "Developers"
  if (role === "ceo") return "CEO"
  if (role === "admin") return "Admin"
  if (role === "hr") return "HR"
  if (role === "branch_manager") return "Branch Manager"
  return "Employee"
}
