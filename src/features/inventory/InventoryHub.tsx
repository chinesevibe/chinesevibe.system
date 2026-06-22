import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileClock,
  LayoutDashboard,
  ListChecks,
  Package,
  PackagePlus,
  PackageX,
  ShieldAlert,
  ScanSearch,
  Tags,
  Truck,
  Warehouse,
} from "lucide-react"

import { StatusPill } from "@/components/brand/StatusPill"
import type { InventoryAlertRow } from "@/features/inventory/expansion-data"
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

const QUICK_ACTION_ITEMS: HubItem[] = [
  OPERATIONAL_ITEMS[0],
  OPERATIONAL_ITEMS[2],
  OPERATIONAL_ITEMS[3],
  OPERATIONAL_ITEMS[4],
  OPERATIONAL_ITEMS[6],
]

function alertVariant(severity: InventoryAlertRow["severity"]) {
  if (severity === "high") return "rejected" as const
  if (severity === "medium") return "pending" as const
  return "neutral" as const
}

function alertTypeLabel(type: InventoryAlertRow["type"]) {
  if (type === "expiry") return "ใกล้หมดอายุ"
  if (type === "low_stock") return "สต็อกต่ำ"
  return "ผิดปกติ"
}

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

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-brand-red">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

function AlertInbox({
  rows,
  alertCount,
}: {
  rows: InventoryAlertRow[]
  alertCount: number
}) {
  return (
    <section className="space-y-3" data-inventory-guide="hub-alert-inbox">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Alert / Action inbox</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            เรียงงานที่ควรตรวจต่อก่อน แล้วค่อยเปิดหน้าเฉพาะงาน
          </p>
        </div>
        <QuickLink
          href="/admin/inventory/alerts"
          icon={Bell}
          label="เปิด alerts ทั้งหมด"
          badge={alertCount}
        />
      </div>

      {rows.length > 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="group rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill
                      label={alertTypeLabel(row.type)}
                      variant={alertVariant(row.severity)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {row.branchName}
                      {row.warehouseName ? ` • ${row.warehouseName}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {row.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {row.detail}
                  </p>
                </div>
                <ArrowUpRight
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-red"
                  aria-hidden
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
          ยังไม่มี alert ค้างในตอนนี้ เปิดหน้าสต็อกหรือรับเข้าเพื่อเริ่มงานประจำวันได้เลย
        </div>
      )}
    </section>
  )
}

export function InventoryHub({
  staffMode = false,
  alertCount = 0,
  alerts = [],
}: {
  staffMode?: boolean
  alertCount?: number
  alerts?: InventoryAlertRow[]
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
            เริ่มจากงานด่วนของวันนี้ แล้วค่อยเข้า workspace รายประเภทเมื่อพร้อมตรวจรับ เบิก โอน หรือตรวจนับ
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

      <section className="space-y-3" data-inventory-guide="hub-summary">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">ภาพรวมงานวันนี้</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              โฟกัสงานที่ต้องลงมือก่อน แล้วค่อยเปิดหน้าวิเคราะห์เชิงลึก
            </p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={ShieldAlert}
            label="Alerts ค้างตรวจ"
            value={alertCount.toLocaleString("th-TH")}
            hint="รวม low stock, expiry และ anomaly ที่ควรเปิดดูต่อ"
          />
          <SummaryCard
            icon={ListChecks}
            label="Workflow หลัก"
            value={String(OPERATIONAL_ITEMS.length)}
            hint="รับเข้า เบิก โอน ตรวจนับ ใช้จริง และเสียหาย อยู่ใน workspace เดียวกัน"
          />
          <SummaryCard
            icon={Clock3}
            label="Quick actions"
            value={String(QUICK_ACTION_ITEMS.length)}
            hint="เปิดงานประจำที่ใช้บ่อยโดยไม่ต้องไล่จากเมนูย่อย"
          />
          <SummaryCard
            icon={FileClock}
            label="โหมดการดูแล"
            value={staffMode ? "Staff" : "Admin"}
            hint={
              staffMode
                ? "โฟกัสงานปฏิบัติการประจำวันเป็นหลัก"
                : "เข้าถึงทั้ง workspace และข้อมูลหลักของคลัง"
            }
          />
        </div>
      </section>

      <HubSection
        label="Quick actions"
        hint="ทางลัดสำหรับงานที่มักต้องเปิดก่อนในแต่ละวัน"
        items={QUICK_ACTION_ITEMS}
        columnsClass="grid-cols-1 sm:grid-cols-2 xl:grid-cols-5"
        sectionGuideId="hub-quick-actions"
      />

      <AlertInbox rows={alerts} alertCount={alertCount} />

      <HubSection
        label="All workspaces"
        hint="workspace หลักของคลังสำหรับเปิดดูงานตามหมวด เมื่อพ้นขั้นคัดกรองเบื้องต้นแล้ว"
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
