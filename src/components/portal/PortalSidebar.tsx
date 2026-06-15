"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { AdminNavIcon } from "@/components/admin/admin-nav-icons"
import { ADMIN_SIDEBAR_WIDTH_CLASS } from "@/components/admin/admin-layout"
import type { AdminNavItem } from "@/components/admin/admin-nav-types"
import { isPortalNavActive } from "@/components/portal/portal-nav"
import { BrandMark } from "@/components/brand/BrandMark"
import { useLocale } from "@/features/portal/LocaleProvider"
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
          Your HR
          <br />
          at Your
          <br />
          Fingertips
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

export function PortalNavLinks({
  items,
  onNavigate,
}: {
  items: AdminNavItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { tx } = useLocale()

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map((item) => {
        const active = isPortalNavActive(pathname, item.href)
        const label = item.labelKey ? tx(item.labelKey) : item.label ?? item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-red text-white shadow-sm"
                : "text-foreground/80 hover:bg-muted hover:text-foreground"
            )}
          >
            <AdminNavIcon name={item.icon} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 leading-snug">{label}</span>
            {!active ? (
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground/45"
                aria-hidden
              />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

export function PortalSidebar({ items }: { items: AdminNavItem[] }) {
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
        <PortalNavLinks items={items} />
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
