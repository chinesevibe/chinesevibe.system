import { AlertTriangle, BellRing, ShieldAlert, TimerReset } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { InventoryAlertsPanel } from "@/features/inventory/InventoryAlertsPanel"
import {
  getInventoryAlerts,
  getInventoryFilterOptions,
} from "@/features/inventory/expansion-data"
import { InventoryFilterBar } from "@/features/inventory/InventoryFilterBar"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function toPortalAlertHref(href: string) {
  if (href.startsWith("/admin/inventory/stock?")) {
    const url = new URL(href, "https://inventory.local")
    const portalAlertParams = new URLSearchParams()
    const branchId = url.searchParams.get("branch_id")
    const warehouseId = url.searchParams.get("warehouse_id")
    const belowMin = url.searchParams.get("below_min")
    const expiring = url.searchParams.get("expiring")

    if (expiring === "1") {
      if (branchId) portalAlertParams.set("branch_id", branchId)
      if (warehouseId) portalAlertParams.set("warehouse_id", warehouseId)
      portalAlertParams.set("type", "expiry")
      const query = portalAlertParams.toString()
      return query ? `/portal/alerts?${query}` : "/portal/alerts?type=expiry"
    }

    if (branchId) portalAlertParams.set("branch_id", branchId)
    if (warehouseId) portalAlertParams.set("warehouse_id", warehouseId)
    if (belowMin === "1") portalAlertParams.set("view", "below-min")
    const query = portalAlertParams.toString()
    return query ? `/portal/stock?${query}` : "/portal/stock"
  }

  if (href.startsWith("/admin/inventory/damage/")) {
    return href.replace("/admin/inventory/damage/", "/portal/damage/")
  }

  if (href === "/admin/inventory/reports/variance") {
    return "/portal/stock-count"
  }

  return href
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof BellRing
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-brand-red" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

export default async function PortalAlertsPage({ searchParams }: PageProps) {
  await requireManagedInventoryPortal()

  const filters = parseInventoryFilters(await searchParams)
  const [rows, options] = await Promise.all([
    getInventoryAlerts(filters),
    getInventoryFilterOptions(),
  ])

  const expiryCount = rows.filter((row) => row.type === "expiry").length
  const lowStockCount = rows.filter((row) => row.type === "low_stock").length
  const anomalyCount = rows.filter((row) => row.type === "anomaly").length
  const highSeverityCount = rows.filter((row) => row.severity === "high").length
  const portalRows = rows.map((row) => ({ ...row, href: toPortalAlertHref(row.href) }))

  return (
    <AdminPageShell
      title="รายการเตือน"
      description="ดูของใกล้หมดอายุ สต็อกต่ำ และรายการผิดปกติจากมือถือ แล้วเปิดงานที่ต้องแก้ต่อ"
    >
      <PortalInventoryTaskNav current="alerts" showManagerLinks />

      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="แจ้งเตือนทั้งหมด" value={rows.length} icon={BellRing} />
          <SummaryCard label="ใกล้หมดอายุ" value={expiryCount} icon={TimerReset} />
          <SummaryCard label="สต็อกต่ำ" value={lowStockCount} icon={AlertTriangle} />
          <SummaryCard
            label="ระดับสูง"
            value={highSeverityCount || anomalyCount}
            icon={ShieldAlert}
          />
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">ลำดับเช็คแนะนำ</p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li>1. เปิดรายการระดับสูงหรือผิดปกติก่อน</li>
            <li>2. ไล่ของใกล้หมดอายุเพื่อกันของค้างคลัง</li>
            <li>3. ถ้าสต็อกต่ำ ให้เปิดหน้าสต็อกหรืองานเติมของต่อทันที</li>
          </ul>
        </div>

        <InventoryFilterBar options={options} showType />

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">กล่องแจ้งเตือนงานคลัง</h2>
            <p className="text-sm text-muted-foreground">
              เปิดจากรายการนี้เพื่อไล่ตัดสินใจเรื่องใกล้หมดอายุ การเติมของ และรายการผิดปกติ
            </p>
          </div>
          <InventoryAlertsPanel rows={portalRows} />
        </section>
      </div>
    </AdminPageShell>
  )
}
