import { redirect } from "next/navigation"
import { cookies } from "next/headers"

import { PORTAL_NAV_ITEMS } from "@/components/portal/portal-nav"
import { PortalShell } from "@/components/portal/PortalShell"
import {
  canUseWorkerFeatures,
  isPendingRegistration,
  PENDING_REGISTRATION_PATH,
} from "@/lib/auth/employee-access"
import { getCurrentEmployee } from "@/lib/auth/session"
import {
  adminLoginPath,
  canAccessEmployeePortal,
  canAccessPortalInventoryWorkspace,
} from "@/lib/auth/roles"
import { coerceLocale, LOCALE_COOKIE } from "@/lib/i18n/types"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const employee = await getCurrentEmployee()
  if (!employee) redirect("/login?error=session_failed")

  if (isPendingRegistration(employee)) {
    redirect(PENDING_REGISTRATION_PATH)
  }

  if (!canUseWorkerFeatures(employee)) {
    redirect("/login?error=session_failed")
  }

  if (!canAccessEmployeePortal(employee)) {
    redirect(
      adminLoginPath(
        employee.role,
        employee.status,
        employee.department,
        employee.position
      )
    )
  }

  const portalNavItems = canAccessPortalInventoryWorkspace(employee)
    ? PORTAL_NAV_ITEMS
    : PORTAL_NAV_ITEMS.filter((item) => item.href !== "/portal/inventory")

  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  const initialLocale = coerceLocale(cookieLocale ?? employee.preferred_locale)

  return (
    <PortalShell
      navItems={portalNavItems}
      initialLocale={initialLocale}
      user={{
        name: employee.name,
        role: employee.role,
        position: employee.position,
        avatarUrl: employee.avatarUrl,
      }}
    >
      {children}
    </PortalShell>
  )
}
