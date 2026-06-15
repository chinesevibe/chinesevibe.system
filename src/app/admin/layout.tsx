import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { AdminShell } from "@/components/admin/AdminShell"
import {
  getNavGroupsForEmployee,
  isBranchPortalPath,
} from "@/components/admin/branch-nav"
import { isInventoryPortalPath } from "@/components/admin/inventory-nav"
import { withNavGroupAlertBadges } from "@/features/notifications/nav-badges"
import {
  getNotificationInbox,
  resolveNotificationScope,
} from "@/features/notifications/data"
import {
  DEV_VIEW_COOKIE,
  getDevNavGroups,
  getDevNavMode,
  parseDevViewAs,
} from "@/lib/auth/dev-view"
import { requiresOfficerPortalPassword } from "@/lib/auth/department-access"
import {
  OFFICER_PORTAL_VERIFIED_COOKIE,
  isOfficerPasswordVerified,
} from "@/lib/auth/officer-password-session"
import {
  canEmployeeAccessAdminPortal,
  isBranchManager,
  isRestrictedInventoryPortalUser,
  hasFullDataAccess,
  isDev,
} from "@/lib/auth/roles"
import { isInventoryManagerStaff } from "@/lib/auth/department-access"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const employee = await getCurrentEmployee()
  if (!employee) redirect("/login?error=session_failed")
  if (!canEmployeeAccessAdminPortal(employee)) {
    redirect("/login?error=forbidden")
  }

  if (
    !isDev(employee.role) &&
    requiresOfficerPortalPassword(employee.department)
  ) {
    const cookieStore = await cookies()
    const verified = isOfficerPasswordVerified(
      cookieStore.get(OFFICER_PORTAL_VERIFIED_COOKIE)?.value,
      employee.id
    )
    if (!verified) {
      redirect("/login?error=password_required")
    }
  }

  const pathname = (await headers()).get("x-pathname") ?? ""
  const dev = isDev(employee.role)
  const branchManager = !dev && isBranchManager(employee.role)
  const inventoryManager =
    !dev && isInventoryManagerStaff(employee.department, employee.position)
  const restrictedInventory =
    !dev && isRestrictedInventoryPortalUser(employee)

  if (!dev) {
    if (
      branchManager &&
      pathname.startsWith("/admin") &&
      !isBranchPortalPath(pathname)
    ) {
      redirect("/admin/branch")
    }
    if (
      restrictedInventory &&
      pathname.startsWith("/admin") &&
      !isInventoryPortalPath(pathname)
    ) {
      redirect("/admin/inventory")
    }
  }

  const devView = dev
    ? parseDevViewAs((await cookies()).get(DEV_VIEW_COOKIE)?.value)
    : null
  const navMode = dev && devView ? getDevNavMode(devView) : null

  const notificationScope = resolveNotificationScope(employee, devView)
  const notificationInbox = notificationScope
    ? await getNotificationInbox(employee, notificationScope)
    : {
        items: [],
        total: 0,
        approvalTotal: 0,
        complianceTotal: 0,
        navBadges: {},
      }
  const alertBadge = notificationInbox.total
  const approvalBadge = notificationInbox.approvalTotal
  let navGroups =
    dev && devView
      ? getDevNavGroups(devView)
      : getNavGroupsForEmployee(employee)

  if (Object.keys(notificationInbox.navBadges).length > 0) {
    navGroups = withNavGroupAlertBadges(navGroups, notificationInbox.navBadges)
  }

  return (
    <AdminShell
      alertBadge={alertBadge}
      approvalBadge={approvalBadge}
      notificationItems={notificationInbox.items}
      showComplianceLink={
        (notificationScope === "hr" || hasFullDataAccess(employee.role)) &&
        !restrictedInventory &&
        !inventoryManager
      }
      branchMode={navMode?.branchMode ?? branchManager}
      inventoryMode={restrictedInventory}
      inventoryManagerMode={inventoryManager}
      devAllMode={navMode?.devAllMode ?? false}
      devView={devView}
      navGroups={navGroups}
      user={{
        name: employee.name,
        role: employee.role,
        position: employee.position,
        avatarUrl: employee.avatarUrl,
      }}
    >
      {children}
    </AdminShell>
  )
}
