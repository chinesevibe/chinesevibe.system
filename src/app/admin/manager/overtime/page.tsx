import { redirect } from "next/navigation"

import { getCurrentEmployee } from "@/lib/auth/session"

export default async function LegacyManagerOvertimePage() {
  const employee = await getCurrentEmployee()
  if (employee?.role === "branch_manager") {
    redirect("/admin/branch")
  }
  redirect("/admin/manager")
}
