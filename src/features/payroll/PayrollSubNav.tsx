"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/admin/payroll", label: "Hub", exact: true },
  { href: "/admin/payroll/runs", label: "คำนวณเงินเดือน" },
  { href: "/admin/payroll/settings", label: "ตั้งค่าเงินเดือน" },
] as const

export function PayrollSubNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-border/80 bg-muted/30 p-1">
      {LINKS.map((link) => {
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
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
