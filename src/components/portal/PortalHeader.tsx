"use client"

import { LogOut } from "lucide-react"

import type { AdminNavItem } from "@/components/admin/admin-nav-types"
import { LanguageSwitcher } from "@/components/portal/LanguageSwitcher"
import { PortalMobileNav } from "@/components/portal/PortalMobileNav"
import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { EmployeeUserChip } from "@/lib/auth/session"

function portalRoleLabel(role: EmployeeUserChip["role"]) {
  if (role === "dev") return "ทีมพัฒนา"
  if (role === "inventory") return "คลังสินค้า"
  if (role === "branch_manager") return "ผู้จัดการสาขา"
  if (role === "hr") return "HR"
  if (role === "ceo") return "CEO"
  return "พนักงาน"
}

export function PortalHeader({
  user,
  navItems,
}: {
  user: EmployeeUserChip
  navItems: AdminNavItem[]
}) {
  const { tx } = useLocale()

  return (
    <header className="z-10 shrink-0 border-b border-border/80 bg-white px-3 py-2 md:px-4 md:py-2.5">
      <div className="flex items-center gap-3">
        <PortalMobileNav items={navItems} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold md:text-base">
            {tx("portal.title")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user.position ?? portalRoleLabel(user.role)}
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
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
                {portalRoleLabel(user.role)}
              </p>
            </div>
          </div>
          <form action="/api/auth/logout" method="post" className="hidden md:block">
            <Button variant="ghost" size="sm" type="submit" className="gap-2">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{tx("portal.logout")}</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
