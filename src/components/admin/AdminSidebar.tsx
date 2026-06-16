"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import {
  isAdminNavActive,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/components/admin/admin-nav"
import { AdminNavIcon } from "@/components/admin/admin-nav-icons"
import { useAdminNotificationsOptional } from "@/components/admin/AdminNotificationProvider"
import { isBranchNavActive } from "@/components/admin/branch-nav"
import { isInventoryManagerNavActive, isInventoryNavActive } from "@/components/admin/inventory-nav"
import { isDevNavActive } from "@/lib/auth/dev-view"
import { ADMIN_SIDEBAR_WIDTH_CLASS } from "@/components/admin/admin-layout"
import { BrandMark } from "@/components/brand/BrandMark"
import { cn } from "@/lib/utils"

function SidebarPromo() {
  return (
    <div className="relative mx-3 mb-3 min-h-[132px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF6F6] via-[#FFF0F0] to-[#FFE4E4] px-4 pb-2 pt-4">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-[radial-gradient(ellipse_120%_80%_at_50%_100%,rgba(229,57,53,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative flex items-end justify-between gap-2">
        <p className="max-w-[11rem] text-left text-[17px] font-bold leading-[1.25] text-brand-red">
          ร่วมกันสร้าง
          <br />
          ทีมที่แข็งแกร่ง
          <br />
          ไปด้วยกัน!
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/mascot-hd.png"
          alt=""
          width={108}
          height={130}
          className="-mb-1 -mr-1 h-[108px] w-auto shrink-0 object-contain object-bottom drop-shadow-sm"
        />
      </div>
    </div>
  )
}

export function AdminNavLinks({
  groups,
  items,
  branchMode = false,
  inventoryMode = false,
  inventoryManagerMode = false,
  devAllMode = false,
  onNavigate,
}: {
  groups?: AdminNavGroup[]
  items?: AdminNavItem[]
  branchMode?: boolean
  inventoryMode?: boolean
  inventoryManagerMode?: boolean
  devAllMode?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = devAllMode
    ? isDevNavActive
    : inventoryManagerMode
      ? isInventoryManagerNavActive
      : inventoryMode
        ? isInventoryNavActive
        : branchMode
          ? isBranchNavActive
          : isAdminNavActive

  if (groups && groups.length > 0) {
    return (
      <nav className="flex flex-col gap-4 px-2">
        {groups.map((group) => (
          <div key={group.title || "default"}>
            {group.title ? (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <AdminNavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  indented={Boolean(group.title)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {(items ?? []).map((item) => (
        <AdminNavLink
          key={item.href}
          item={item}
          active={isActive(pathname, item.href)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

function AdminNavLink({
  item,
  active,
  indented = false,
  onNavigate,
}: {
  item: AdminNavItem
  active: boolean
  indented?: boolean
  onNavigate?: () => void
}) {
  const { label, href, icon, badge } = item

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
        indented ? "pl-5 pr-3" : "px-3",
        active
          ? "bg-brand-red text-white shadow-sm"
          : "text-foreground/80 hover:bg-muted hover:text-foreground"
      )}
    >
      <span className="relative shrink-0">
        <AdminNavIcon name={icon} className="size-4" />
        {badge && badge > 0 ? (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 size-2 rounded-full",
              active
                ? "bg-white ring-2 ring-brand-red"
                : "bg-brand-red ring-2 ring-white"
            )}
            aria-hidden
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
      {badge && badge > 0 ? (
        <span
          className={cn(
            "inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            active ? "bg-white/20 text-white" : "bg-brand-red text-white"
          )}
          title={`${badge} รายการรอดำเนินการ`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : !active ? (
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground/45"
          aria-hidden
        />
      ) : null}
    </Link>
  )
}

export function AdminSidebar({
  groups: groupsProp,
  items,
  branchMode = false,
  inventoryMode = false,
  inventoryManagerMode = false,
  devAllMode = false,
}: {
  groups?: AdminNavGroup[]
  items?: AdminNavItem[]
  branchMode?: boolean
  inventoryMode?: boolean
  inventoryManagerMode?: boolean
  devAllMode?: boolean
}) {
  const live = useAdminNotificationsOptional()
  const groups =
    live && live.navGroups.length > 0 ? live.navGroups : groupsProp

  return (
    <aside
      className={cn(
        "hidden h-full max-h-dvh shrink-0 flex-col overflow-hidden border-r border-border/80 bg-white md:flex",
        ADMIN_SIDEBAR_WIDTH_CLASS
      )}
    >
      <div className="shrink-0 border-b border-border/80 px-5 py-5 [@media(max-height:900px)]:py-4">
        <BrandMark variant="sidebar" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <AdminNavLinks
          groups={groups}
          items={items}
          branchMode={branchMode}
          inventoryMode={inventoryMode}
          inventoryManagerMode={inventoryManagerMode}
          devAllMode={devAllMode}
        />
      </div>
      <div className="shrink-0 [@media(max-height:900px)]:origin-bottom [@media(max-height:900px)]:scale-[0.92]">
        <SidebarPromo />
      </div>
      <p className="px-4 pb-4 text-center text-[10px] leading-relaxed text-muted-foreground">
        © 2025 Zhongguomingtang
        <br />
        All rights reserved.
      </p>
    </aside>
  )
}
