import { redirect } from "next/navigation"

import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function MobileInventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const employee = await getCurrentEmployee()

  if (!employee) {
    redirect("/login?next=/m/inventory")
  }

  if (!canAccessPortalInventoryWorkspace(employee)) {
    redirect("/portal")
  }

  return <>{children}</>
}
