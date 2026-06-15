import { redirect } from "next/navigation"

import {
  isPendingRegistration,
  PENDING_REGISTRATION_PATH,
} from "@/lib/auth/employee-access"
import { adminLoginPath } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

/** Legacy entry — routes workers to portal or admin by role. */
export default async function EmployeeInfoPage() {
  const employee = await getCurrentEmployee()
  if (!employee) redirect("/login")

  if (isPendingRegistration(employee)) {
    redirect(PENDING_REGISTRATION_PATH)
  }

  redirect(adminLoginPath(employee.role, employee.status, employee.department))
}
