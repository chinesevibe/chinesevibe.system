import Link from "next/link"
import {
  AlertTriangle,
  ArrowRightLeft,
  Barcode,
  ClipboardList,
  LayoutDashboard,
  Package,
  PackageCheck,
  ShieldAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"

type TaskKey =
  | "home"
  | "inbound"
  | "stock"
  | "damage"
  | "requisition"
  | "transfer"
  | "alerts"
  | "stock-count"

const workerItems = [
  { key: "home", href: "/portal/inventory", label: "หน้าคลัง", icon: LayoutDashboard },
  { key: "inbound", href: "/portal/inbound", label: "รับเข้า", icon: Barcode },
  { key: "stock", href: "/portal/stock", label: "เช็คสต็อก", icon: Package },
  { key: "damage", href: "/portal/damage", label: "เสียหาย", icon: AlertTriangle },
] as const

const managerItems = [
  { key: "requisition", href: "/portal/requisition", label: "ใบเบิก", icon: ClipboardList },
  { key: "transfer", href: "/portal/transfer", label: "โอนสินค้า", icon: ArrowRightLeft },
  { key: "alerts", href: "/portal/alerts", label: "รายการเตือน", icon: ShieldAlert },
  { key: "stock-count", href: "/portal/stock-count", label: "นับสต็อก", icon: PackageCheck },
] as const

export function PortalInventoryTaskNav({
  current,
  showManagerLinks = false,
}: {
  current: TaskKey
  showManagerLinks?: boolean
}) {
  const items = showManagerLinks ? [...workerItems, ...managerItems] : workerItems

  return (
    <div className="mb-4 space-y-2">
      <div>
        <p className="text-sm font-semibold">สลับงานคลัง</p>
        <p className="text-xs text-muted-foreground">
          เปิดงานที่ต้องทำต่อได้ทันทีโดยไม่ต้องย้อนกลับเมนูหลัก
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = item.key === current
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                active
                  ? "border-brand-red bg-brand-red text-white"
                  : "border-border/80 bg-background text-foreground hover:bg-muted/40"
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
