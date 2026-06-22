import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { InventoryAlertsPanel } from "@/features/inventory/InventoryAlertsPanel"
import {
  getInventoryAlerts,
  getInventoryFilterOptions,
} from "@/features/inventory/expansion-data"
import { InventoryFilterBar } from "@/features/inventory/InventoryFilterBar"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { AlertTriangle, BellRing, ShieldAlert, TimerReset } from "lucide-react"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
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
    <div className="rounded-2xl border border-border/80 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-brand-red" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

export default async function InventoryAlertsPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  const params = await searchParams
  const filters = parseInventoryFilters(params)
  const [rows, options] = await Promise.all([
    getInventoryAlerts(filters),
    getInventoryFilterOptions(),
  ])
  const expiryCount = rows.filter((row) => row.type === "expiry").length
  const lowStockCount = rows.filter((row) => row.type === "low_stock").length
  const anomalyCount = rows.filter((row) => row.type === "anomaly").length
  const highSeverityCount = rows.filter((row) => row.severity === "high").length

  return (
    <AdminPageShell
      title="Inventory Alerts"
      description="แจ้งเตือน expiry, low stock และ anomaly พร้อมลิงก์ไปหน้าที่เกี่ยวข้อง"
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="แจ้งเตือนทั้งหมด" value={rows.length} icon={BellRing} />
          <SummaryCard label="ใกล้หมดอายุ" value={expiryCount} icon={TimerReset} />
          <SummaryCard label="สต็อกต่ำ" value={lowStockCount} icon={AlertTriangle} />
          <SummaryCard label="ระดับสูง" value={highSeverityCount || anomalyCount} icon={ShieldAlert} />
        </div>
        <InventoryFilterBar options={options} showType />
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Alert inbox</h2>
              <p className="text-sm text-muted-foreground">
                เปิดจากรายการนี้เพื่อไล่ตัดสินใจเรื่อง expiry, reorder และรายการผิดปกติ
              </p>
            </div>
          </div>
          <InventoryAlertsPanel rows={rows} />
        </section>
      </div>
    </AdminPageShell>
  )
}
