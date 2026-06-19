import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  Package,
  PackagePlus,
  PackageX,
  ScanSearch,
  Tags,
  Truck,
  Warehouse,
} from "lucide-react"

import { cn } from "@/lib/utils"

type HubItem = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  tone: "red" | "amber" | "blue" | "violet" | "emerald" | "slate"
}

const TONE_STYLES: Record<
  HubItem["tone"],
  { iconBg: string; iconText: string; ring: string }
> = {
  red: {
    iconBg: "bg-brand-red/10",
    iconText: "text-brand-red",
    ring: "hover:ring-brand-red/25",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-700",
    ring: "hover:ring-amber-500/25",
  },
  blue: {
    iconBg: "bg-sky-500/10",
    iconText: "text-sky-700",
    ring: "hover:ring-sky-500/25",
  },
  violet: {
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-700",
    ring: "hover:ring-violet-500/25",
  },
  emerald: {
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-700",
    ring: "hover:ring-emerald-500/25",
  },
  slate: {
    iconBg: "bg-muted",
    iconText: "text-muted-foreground",
    ring: "hover:ring-border",
  },
}

const OPERATIONAL_ITEMS: HubItem[] = [
  {
    title: "รับเข้า",
    description: "สร้างใบรับและสแกน LIFF",
    href: "/admin/inventory/inbound",
    icon: PackagePlus,
    tone: "emerald",
  },
  {
    title: "สต็อก",
    description: "คงเหลือตามคลังและสาขา",
    href: "/admin/inventory/stock",
    icon: BarChart3,
    tone: "blue",
  },
  {
    title: "ใบเบิก",
    description: "เบิกวัตถุดิบออกจากคลัง",
    href: "/admin/inventory/requisition",
    icon: ClipboardList,
    tone: "violet",
  },
  {
    title: "โอนสินค้า",
    description: "ย้ายสต็อกระหว่างคลัง",
    href: "/admin/inventory/transfer",
    icon: Truck,
    tone: "blue",
  },
  {
    title: "ตรวจนับสต็อก",
    description: "นับจริงเทียบยอดระบบ",
    href: "/admin/inventory/stock-count",
    icon: ScanSearch,
    tone: "amber",
  },
  {
    title: "ใช้จริง",
    description: "บันทึกการใช้งานจริง",
    href: "/admin/inventory/consumption",
    icon: Package,
    tone: "slate",
  },
  {
    title: "เสียหาย",
    description: "แจ้งของเสียหายหรือสูญหาย",
    href: "/admin/inventory/damage",
    icon: PackageX,
    tone: "red",
  },
]

const MASTER_DATA_ITEMS: HubItem[] = [
  {
    title: "SKU",
    description: "รหัสสินค้า หน่วย Min/Max",
    href: "/admin/inventory/sku",
    icon: Tags,
    tone: "red",
  },
  {
    title: "Supplier",
    description: "ผู้จำหน่ายและติดต่อ",
    href: "/admin/inventory/suppliers",
    icon: Truck,
    tone: "slate",
  },
  {
    title: "สาขา (คลัง)",
    description: "สาขาระบบคลังแยกจาก HR",
    href: "/admin/inventory/branches",
    icon: Building2,
    tone: "blue",
  },
  {
    title: "คลังสินค้า",
    description: "คลังย่อยในแต่ละสาขา",
    href: "/admin/inventory/warehouses",
    icon: Warehouse,
    tone: "violet",
  },
]

function HubTile({ href, icon: Icon, title, description, tone }: HubItem) {
  const styles = TONE_STYLES[tone]

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-md hover:ring-2",
        styles.ring
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            styles.iconBg
          )}
        >
          <Icon className={cn("size-5", styles.iconText)} aria-hidden />
        </div>
        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-red"
          aria-hidden
        />
      </div>
      <div className="mt-3 min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </Link>
  )
}

function HubSection({
  label,
  hint,
  items,
  columnsClass,
  sectionGuideId,
}: {
  label: string
  hint?: string
  items: HubItem[]
  columnsClass: string
  sectionGuideId?: string
}) {
  return (
    <section className="space-y-3" data-inventory-guide={sectionGuideId}>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          {hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {items.length} รายการ
        </span>
      </div>
      <div className={cn("grid gap-3", columnsClass)}>
        {items.map((item) => (
          <HubTile key={item.href} {...item} />
        ))}
      </div>
    </section>
  )
}

function DocQuickLink({
  href,
  icon: Icon,
  label,
  external = false,
  imageSrc,
}: {
  href: string
  icon?: LucideIcon
  label: string
  external?: boolean
  imageSrc?: string
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-brand-red/30 hover:bg-muted/30"
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageSrc} alt="" className="size-5 shrink-0 rounded" width={20} height={20} />
      ) : Icon ? (
        <Icon className="size-4 shrink-0 text-brand-red" aria-hidden />
      ) : null}
      <span>{label}</span>
      {external ? <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden /> : null}
    </a>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string
  icon: LucideIcon
  label: string
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm font-medium transition-colors hover:border-brand-red/30 hover:bg-muted/40"
    >
      <Icon className="size-4 text-brand-red" aria-hidden />
      <span>{label}</span>
      {badge != null && badge > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

export function InventoryHub({
  staffMode = false,
  alertCount = 0,
}: {
  staffMode?: boolean
  alertCount?: number
}) {
  return (
    <div className="space-y-8">
      <div
        data-inventory-guide="hub-intro"
        className="flex flex-col gap-4 rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 via-card to-card p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">ศูนย์ควบคุมคลังสินค้า</p>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
            เลือกงานประจำวันหรือตั้งค่าข้อมูลหลัก — เมนูด้านบนใช้สลับหน้างานได้ตลอด
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DocQuickLink
            href="/docs/INVENTORY_HANDOFF.html"
            imageSrc="/brand/mascot.svg"
            label="คู่มือ & Checklist UAT"
            external
          />
          <QuickLink
            href="/admin/inventory/dashboard"
            icon={LayoutDashboard}
            label="แดชบอร์ด"
          />
          <QuickLink
            href="/admin/inventory/alerts"
            icon={Bell}
            label="Alerts"
            badge={alertCount}
          />
        </div>
      </div>

      <HubSection
        label="งานคลัง"
        hint="รับเข้า · สต็อก · เบิก · โอน · ตรวจนับ · ใช้จริง · เสียหาย"
        items={OPERATIONAL_ITEMS}
        columnsClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        sectionGuideId="hub-operations"
      />

      {!staffMode ? (
        <HubSection
          label="ข้อมูลหลัก"
          hint="ตั้งค่าก่อนเริ่มใช้งานคลัง — แยกจากข้อมูลสาขา HR"
          items={MASTER_DATA_ITEMS}
          columnsClass="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
          sectionGuideId="hub-master-data"
        />
      ) : null}
    </div>
  )
}
