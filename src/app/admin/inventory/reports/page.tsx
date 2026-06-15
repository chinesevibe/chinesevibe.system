import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

const REPORT_LINKS = [
  { href: "/admin/inventory/reports/stock", label: "Stock On Hand" },
  { href: "/admin/inventory/reports/inbound", label: "Inbound" },
  { href: "/admin/inventory/reports/requisition", label: "Requisition" },
  { href: "/admin/inventory/reports/consumption", label: "Consumption" },
  { href: "/admin/inventory/reports/damage", label: "Damage" },
  { href: "/admin/inventory/reports/transfer", label: "Transfer" },
  { href: "/admin/inventory/reports/variance", label: "Stock Count Variance" },
  { href: "/admin/inventory/reports/audit", label: "Audit Trail" },
]

export default async function InventoryReportsHubPage() {
  await requireInventoryPortal()
  return (
    <AdminPageShell
      title="Inventory Reports"
      description="รวมรายงานหลัก การเคลื่อนไหว ความต่างการนับ และ audit trail"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {REPORT_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-border/80 bg-muted/15 px-4 py-3 text-sm font-medium transition-colors hover:border-brand-red/35 hover:bg-muted/40"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </AdminPageShell>
  )
}
