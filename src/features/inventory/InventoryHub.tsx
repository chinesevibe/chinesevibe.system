import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  Building2,
  ClipboardList,
  Package,
  PackagePlus,
  Truck,
  Warehouse,
} from "lucide-react"

type HubItem = {
  title: string
  href: string
  icon: LucideIcon
}

const OPERATIONAL_ITEMS: HubItem[] = [
  {
    title: "รับเข้า",
    href: "/admin/inventory/inbound",
    icon: PackagePlus,
  },
  {
    title: "สต็อก",
    href: "/admin/inventory/stock",
    icon: BarChart3,
  },
  {
    title: "ใบเบิก",
    href: "/admin/inventory/requisition",
    icon: ClipboardList,
  },
  {
    title: "โอนสินค้า",
    href: "/admin/inventory/transfer",
    icon: Truck,
  },
  {
    title: "ใช้จริง",
    href: "/admin/inventory/consumption",
    icon: Package,
  },
  {
    title: "เสียหาย",
    href: "/admin/inventory/damage",
    icon: PackagePlus,
  },
]

const MASTER_DATA_ITEMS: HubItem[] = [
  {
    title: "SKU",
    href: "/admin/inventory/sku",
    icon: Package,
  },
  {
    title: "Supplier",
    href: "/admin/inventory/suppliers",
    icon: Truck,
  },
  {
    title: "สาขา",
    href: "/admin/inventory/branches",
    icon: Building2,
  },
  {
    title: "คลัง",
    href: "/admin/inventory/warehouses",
    icon: Warehouse,
  },
]

function HubTile({ href, icon: Icon, title }: HubItem) {
  return (
    <Link
      href={href}
      className="flex min-h-10 items-center gap-2 rounded-lg border border-border/80 bg-muted/15 px-3 py-2 text-sm font-medium transition-colors hover:border-brand-red/35 hover:bg-muted/40"
    >
      <Icon className="size-4 shrink-0 text-brand-red" aria-hidden />
      <span className="truncate">{title}</span>
    </Link>
  )
}

function HubSection({
  label,
  items,
  columnsClass,
}: {
  label: string
  items: HubItem[]
  columnsClass: string
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      <div className={`grid gap-2 ${columnsClass}`}>
        {items.map((item) => (
          <HubTile key={item.href} {...item} />
        ))}
      </div>
    </section>
  )
}

export function InventoryHub({ staffMode = false }: { staffMode?: boolean }) {
  return (
    <div className="space-y-4">
      <HubSection
        label="งานคลัง"
        items={OPERATIONAL_ITEMS}
        columnsClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      />
      {!staffMode ? (
        <HubSection
          label="ข้อมูลหลัก"
          items={MASTER_DATA_ITEMS}
          columnsClass="grid-cols-2 sm:grid-cols-4"
        />
      ) : null}
    </div>
  )
}
