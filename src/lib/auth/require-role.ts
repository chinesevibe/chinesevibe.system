import { redirect } from "next/navigation"

import { getCurrentEmployee, type Employee } from "@/lib/auth/session"

// Role comes from hr_employees on every call (not cached in the JWT),
// so role changes take effect immediately.
export async function requireRole(
  ...roles: Array<Employee["role"]>
): Promise<Employee> {
  const employee = await getCurrentEmployee()

  if (!employee) {
    redirect("/login")
  }
  if (employee.role !== "dev" && !roles.includes(employee.role)) {
    redirect("/login?error=forbidden")
  }

  return employee
}
