"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const OPERATIONAL_LINKS = [
  { href: "/admin/inventory", label: "ภาพรวม", exact: true },
  { href: "/admin/inventory/dashboard", label: "แดชบอร์ด" },
  { href: "/admin/inventory/alerts", label: "Alerts" },
  { href: "/admin/inventory/reports", label: "Reports" },
  { href: "/admin/inventory/stock", label: "สต็อก" },
  { href: "/admin/inventory/inbound", label: "รับเข้า" },
  { href: "/admin/inventory/requisition", label: "ใบเบิก" },
  { href: "/admin/inventory/transfer", label: "โอนสินค้า" },
  { href: "/admin/inventory/consumption", label: "บันทึกใช้" },
  { href: "/admin/inventory/damage", label: "แจ้งเสียหาย" },
] as const

const MASTER_DATA_LINKS = [
  { href: "/admin/inventory/sku", label: "SKU" },
  { href: "/admin/inventory/suppliers", label: "Supplier" },
  { href: "/admin/inventory/branches", label: "สาขา (คลัง)" },
  { href: "/admin/inventory/warehouses", label: "คลังสินค้า" },
] as const

export function InventorySubNav({
  staffMode = false,
  alertCount = 0,
}: {
  staffMode?: boolean
  alertCount?: number
}) {
  const pathname = usePathname()
  const links = staffMode
    ? OPERATIONAL_LINKS
    : [...OPERATIONAL_LINKS, ...MASTER_DATA_LINKS]

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-muted/30 p-1">
      {links.map((link) => {
        const active =
          "exact" in link && link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
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
  )
}
