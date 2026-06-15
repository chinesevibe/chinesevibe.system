import { AdminHeader } from "@/components/admin/AdminHeader"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import type { AdminNavGroup, AdminNavItem } from "@/components/admin/admin-nav"
import type { DevViewAs } from "@/lib/auth/dev-view"
import type { EmployeeUserChip } from "@/lib/auth/session"
import type { NotificationItem } from "@/features/notifications/types"

export function AdminShell({
  children,
  alertBadge = 0,
  approvalBadge = 0,
  notificationItems = [],
  showComplianceLink = true,
  user,
  navGroups,
  navItems,
  branchMode = false,
  inventoryMode = false,
  devAllMode = false,
  devView = null,
}: {
  children: React.ReactNode
  alertBadge?: number
  approvalBadge?: number
  notificationItems?: NotificationItem[]
  showComplianceLink?: boolean
  user?: EmployeeUserChip
  navGroups?: AdminNavGroup[]
  navItems?: AdminNavItem[]
  branchMode?: boolean
  inventoryMode?: boolean
  devAllMode?: boolean
  devView?: DevViewAs | null
}) {
  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-background">
      <AdminSidebar
        groups={navGroups}
        items={navItems}
        branchMode={branchMode}
        inventoryMode={inventoryMode}
        devAllMode={devAllMode}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader
          alertBadge={alertBadge}
          approvalBadge={approvalBadge}
          notificationItems={notificationItems}
          showComplianceLink={showComplianceLink}
          user={user}
          navGroups={navGroups}
          navItems={navItems}
          branchMode={branchMode}
          inventoryMode={inventoryMode}
          devAllMode={devAllMode}
          devView={devView}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4 lg:p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
