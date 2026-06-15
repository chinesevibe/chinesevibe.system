import { LogOut } from "lucide-react"

import type { AdminNavGroup, AdminNavItem } from "@/components/admin/admin-nav"
import { AdminEmployeeSearch } from "@/components/admin/AdminEmployeeSearch"
import { AdminMobileNav } from "@/components/admin/AdminMobileNav"
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell"
import { DevRoleSwitcher } from "@/components/admin/DevRoleSwitcher"
import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { Button } from "@/components/ui/button"
import type { DevViewAs } from "@/lib/auth/dev-view"
import { roleDisplayLabel } from "@/lib/auth/labels"
import type { EmployeeUserChip } from "@/lib/auth/session"
import type { NotificationItem } from "@/features/notifications/types"

export function AdminHeader({
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
  const isDev = user?.role === "dev"

  return (
    <header className="z-10 shrink-0 border-b border-border/80 bg-white px-3 py-2 md:px-4 md:py-2.5">
      <div className="flex items-center gap-3">
        <AdminMobileNav
          groups={navGroups}
          items={navItems}
          branchMode={branchMode}
          inventoryMode={inventoryMode}
          devAllMode={devAllMode}
        />
        <AdminEmployeeSearch />
        <div className="flex items-center gap-1 sm:gap-2">
          {isDev && devView ? <DevRoleSwitcher currentView={devView} /> : null}
          <AdminNotificationBell
            initialApprovalTotal={approvalBadge}
            initialTotal={alertBadge}
            initialItems={notificationItems}
            showComplianceLink={showComplianceLink}
          />
          {user ? (
            <div className="hidden items-center gap-2 rounded-lg border border-border/80 px-2 py-1 sm:flex">
              <EmployeeAvatar
                name={user.name}
                imageUrl={user.avatarUrl}
                size="sm"
                className="border-border"
              />
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {roleDisplayLabel(user.role)}
                </p>
              </div>
            </div>
          ) : null}
          <form action="/api/auth/logout" method="post" className="hidden md:block">
            <Button variant="ghost" size="sm" type="submit" className="gap-2">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
