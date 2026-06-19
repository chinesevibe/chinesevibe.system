"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen } from "lucide-react"

import { useInventoryGuide } from "@/features/inventory/guide/InventoryGuideProvider"
import { cn } from "@/lib/utils"

const OPERATIONAL_LINKS = [
  { href: "/admin/inventory", label: "ภาพรวม", exact: true, guideId: "nav-overview" },
  { href: "/admin/inventory/dashboard", label: "แดชบอร์ด", guideId: "nav-dashboard" },
  { href: "/admin/inventory/alerts", label: "Alerts", guideId: "nav-alerts" },
  { href: "/admin/inventory/reports", label: "Reports", guideId: "nav-reports" },
  { href: "/admin/inventory/stock", label: "สต็อก", guideId: "nav-stock" },
  { href: "/admin/inventory/inbound", label: "รับเข้า", guideId: "nav-inbound" },
  { href: "/admin/inventory/requisition", label: "ใบเบิก", guideId: "nav-requisition" },
  { href: "/admin/inventory/transfer", label: "โอนสินค้า", guideId: "nav-transfer" },
  { href: "/admin/inventory/consumption", label: "บันทึกใช้", guideId: "nav-consumption" },
  { href: "/admin/inventory/damage", label: "แจ้งเสียหาย", guideId: "nav-damage" },
  { href: "/admin/inventory/stock-count", label: "นับสต็อก", guideId: "nav-stock-count" },
] as const

const MASTER_DATA_LINKS = [
  { href: "/admin/inventory/sku", label: "SKU", guideId: "nav-sku" },
  { href: "/admin/inventory/suppliers", label: "Supplier", guideId: "nav-suppliers" },
  { href: "/admin/inventory/branches", label: "สาขา (คลัง)", guideId: "nav-branches" },
  { href: "/admin/inventory/warehouses", label: "คลังสินค้า", guideId: "nav-warehouses" },
  { href: "/admin/inventory/bom", label: "BOM", guideId: "nav-bom" },
] as const

function GuideModeToggle() {
  const { enabled, setEnabled, setOpen, completed, restart } = useInventoryGuide()

  return (
    <button
      type="button"
      data-inventory-guide="guide-toggle"
      onClick={() => {
        if (completed) {
          restart()
          return
        }
        if (enabled) {
          setEnabled(false)
        } else {
          setEnabled(true)
          setOpen(true)
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
        enabled
          ? "border-brand-red/40 bg-brand-red/10 text-brand-red"
          : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40"
      )}
      aria-pressed={enabled}
    >
      <BookOpen className="size-3.5" aria-hidden />
      {enabled ? "โหมดแนะนำ: เปิด" : "โหมดแนะนำ: ปิด"}
    </button>
  )
}

export function InventorySubNav({
  staffMode = false,
  showMasterData = false,
  alertCount = 0,
}: {
  staffMode?: boolean
  showMasterData?: boolean
  alertCount?: number
}) {
  const pathname = usePathname()
  const links =
    staffMode && !showMasterData
      ? OPERATIONAL_LINKS
      : [...OPERATIONAL_LINKS, ...MASTER_DATA_LINKS]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          เมนูคลังสินค้า — สลับหน้างานได้จากแถบด้านล่าง
        </p>
        <GuideModeToggle />
      </div>
      <nav
        data-inventory-guide="subnav"
        className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-muted/30 p-1"
      >
      {links.map((link) => {
        const active =
          "exact" in link && link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            data-inventory-guide={link.guideId}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-red text-white shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground"
            )}
          >
            <span>{link.label}</span>
            {link.href === "/admin/inventory/alerts" && alertCount > 0 ? (
              <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] text-white">
                {alertCount}
              </span>
            ) : null}
          </Link>
        )
      })}
      </nav>
    </div>
  )
}
