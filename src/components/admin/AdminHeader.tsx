"use client"

import { LogOut } from "lucide-react"

import type { AdminNavGroup, AdminNavItem } from "@/components/admin/admin-nav"
import { AdminEmployeeSearch } from "@/components/admin/AdminEmployeeSearch"
import { AdminMobileNav } from "@/components/admin/AdminMobileNav"
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell"
import { useAdminNotifications } from "@/components/admin/AdminNotificationProvider"
import { DevRoleSwitcher } from "@/components/admin/DevRoleSwitcher"
import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { Button } from "@/components/ui/button"
import type { DevViewAs } from "@/lib/auth/dev-view"
import { roleDisplayLabel } from "@/lib/auth/labels"
import type { EmployeeUserChip } from "@/lib/auth/session"

export function AdminHeader({
  showComplianceLink = true,
  user,
  navGroups: navGroupsProp,
  navItems,
  branchMode = false,
  inventoryMode = false,
  inventoryManagerMode = false,
  devAllMode = false,
  devView = null,
}: {
  showComplianceLink?: boolean
  user?: EmployeeUserChip
  navGroups?: AdminNavGroup[]
  navItems?: AdminNavItem[]
  branchMode?: boolean
  inventoryMode?: boolean
  inventoryManagerMode?: boolean
  devAllMode?: boolean
  devView?: DevViewAs | null
}) {
  const isDev = user?.role === "dev"
  const live = useAdminNotifications()
  const navGroups = live.navGroups.length > 0 ? live.navGroups : navGroupsProp

  return (
    <header className="z-10 shrink-0 border-b border-border/80 bg-white px-3 py-2 md:px-4 md:py-2.5">
      <div className="flex items-center gap-3">
        <AdminMobileNav
          groups={navGroups}
          items={navItems}
          branchMode={branchMode}
          inventoryMode={inventoryMode}
          inventoryManagerMode={inventoryManagerMode}
          devAllMode={devAllMode}
        />
        <AdminEmployeeSearch />
        <div className="flex items-center gap-1 sm:gap-2">
          {isDev && devView ? <DevRoleSwitcher currentView={devView} /> : null}
          <AdminNotificationBell showComplianceLink={showComplianceLink} />
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
