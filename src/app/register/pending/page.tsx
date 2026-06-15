import { redirect } from "next/navigation"

import { PendingRegistrationCard } from "@/components/auth/PendingRegistrationCard"
import { isPendingRegistration } from "@/lib/auth/employee-access"
import { adminLoginPath } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function RegisterPendingPage() {
  const employee = await getCurrentEmployee()
  if (!employee) {
    redirect("/login")
  }

  if (!isPendingRegistration(employee)) {
    redirect(adminLoginPath(employee.role, employee.status, employee.department))
  }

  return <PendingRegistrationCard name={employee.name} showLoginHint />
}
