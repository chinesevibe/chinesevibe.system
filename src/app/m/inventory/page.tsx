import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Package,
  Truck,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react"

import { MobileShell } from "@/components/mobile/MobileShell"
import {
  getInventoryAlerts,
  getInventoryDashboardData,
} from "@/features/inventory/expansion-data"
import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

const RED = "#E11D2A"

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const MOVEMENT_LABELS: Record<string, string> = {
  inbound: "รับเข้า",
  consumption: "เบิกใช้",
  damage: "เสียหาย",
  transfer_in: "รับโอน",
  transfer_out: "โอนออก",
  adjustment: "ปรับสต็อก",
  stock_count: "นับสต็อก",
}

export default async function MobileInventoryHub() {
  const employee = await getCurrentEmployee()
  if (!employee) redirect("/login?next=/m/inventory")
  if (!canAccessPortalInventoryWorkspace(employee)) redirect("/portal")

  const [dashData, alerts] = await Promise.all([
    getInventoryDashboardData(),
    getInventoryAlerts({}),
  ])

  const supabase = await createClient()
  const { data: recentMovements } = await supabase
    .from("inv_stock_movements")
    .select("id, movement_type, quantity, created_at, sku_id, inv_skus(name)")
    .order("created_at", { ascending: false })
    .limit(5)

  const { kpis } = dashData
  const topAlerts = alerts.slice(0, 5)

  // Fetch branch name separately since Employee type only carries branch_id
  let branchName: string | null = null
  if (employee.branch_id) {
    const { data: branch } = await supabase
      .from("inv_branches")
      .select("name")
      .eq("id", employee.branch_id)
      .maybeSingle()
    branchName = branch?.name ?? null
  }

  return (
    <MobileShell variant="home" activeTab="home" branchName={branchName}>
      <div className="flex flex-col gap-4 p-4">

        {/* KPI Gradient Card */}
        <div
          className="rounded-2xl p-5 text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${RED} 0%, #c41825 60%, #9e0f1a 100%)`,
          }}
        >
          <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">
            มูลค่าคงคลัง
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {formatBaht(kpis.totalStockValue)}
          </p>


          <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-3 gap-3">
            <KpiChip label="SKU" value={kpis.skuCount} />
            <KpiChip label="ต้องสั่ง" value={kpis.belowMinCount} danger />
            <KpiChip label="รออนุมัติ" value={kpis.pendingRequisitions} />
          </div>
        </div>

        {/* Quick Actions 4-col grid */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction href="/m/inventory/stock" icon={Package} label="สต็อก" color="#fef2f2" />
          <QuickAction href="/m/inventory/inbound" icon={Truck} label="รับเข้า" color="#f0fdf4" />
          <QuickAction href="/m/inventory/damage" icon={AlertTriangle} label="เสียหาย" color="#fffbeb" />
          <QuickAction href="/m/inventory/transfer" icon={ArrowLeftRight} label="โอน" color="#eff6ff" />
        </div>

        {/* Monthly Stats Section */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#16181d]/50 mb-2">
            สถิติเดือนนี้
          </p>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="รับเข้า" value={formatBaht(kpis.inboundValueMtd)} icon={TrendingUp} />
            <StatCard label="เบิกใช้" value={formatBaht(kpis.consumptionValueMtd)} icon={TrendingDown} />
            <StatCard label="เสียหาย" value={formatBaht(kpis.damageValueMtd)} icon={AlertTriangle} />
          </div>
        </section>

        {/* Stock Alerts */}
        {topAlerts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#16181d]/50">
                สต็อกต้องระวัง
              </p>
              <Link
                href="/m/inventory/stock"
                className="text-xs font-medium"
                style={{ color: RED }}
              >
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {topAlerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className="flex items-center justify-between rounded-xl border border-[#eceef1] bg-white p-3 shadow-sm active:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#16181d]">
                      {alert.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{alert.detail}</p>
                  </div>
                  <SeverityBadge severity={alert.severity} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#16181d]/50 mb-2">
            กิจกรรมล่าสุด
          </p>
          {!recentMovements || recentMovements.length === 0 ? (
            <div className="rounded-xl border border-[#eceef1] bg-white px-4 py-8 text-center">
              <Activity size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm font-medium text-gray-400">ยังไม่มีกิจกรรม</p>
              <p className="text-xs text-gray-300 mt-0.5">การเคลื่อนไหวสต็อกจะแสดงที่นี่</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentMovements.map((mov) => {
                const skuRaw = mov.inv_skus as unknown
                const skuName =
                  Array.isArray(skuRaw)
                    ? (skuRaw[0] as { name?: string } | undefined)?.name ?? "—"
                    : (skuRaw as { name?: string } | null)?.name ?? "—"
                const qty = Number(mov.quantity)
                const isPositive = ["inbound", "transfer_in", "adjustment"].includes(
                  mov.movement_type as string
                )
                const label =
                  MOVEMENT_LABELS[mov.movement_type as string] ?? mov.movement_type

                return (
                  <div
                    key={mov.id}
                    className="flex items-center gap-3 rounded-xl border border-[#eceef1] bg-white p-3 shadow-sm"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{
                        background: isPositive ? "#dcfce7" : "#fee2e2",
                        color: isPositive ? "#15803d" : RED,
                      }}
                    >
                      {isPositive ? "+" : "−"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#16181d]">{skuName}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: isPositive ? "#15803d" : RED }}
                      >
                        {isPositive ? "+" : "−"}{Math.abs(qty)}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {formatRelative(mov.created_at as string)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </MobileShell>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiChip({
  label,
  value,
  danger = false,
}: {
  label: string
  value: number
  danger?: boolean
}) {
  return (
    <div className="rounded-xl bg-white/15 p-2.5 text-center">
      <p className={`text-xl font-bold ${danger && value > 0 ? "text-yellow-300" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] text-white/70 mt-0.5">{label}</p>
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
  color?: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-[#eceef1] bg-white p-3 shadow-sm active:bg-gray-50"
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: color ?? "#f4f5f7" }}
      >
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <span className="text-[11px] font-medium text-[#16181d]">{label}</span>
    </Link>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  return (
    <div className="rounded-xl border border-[#eceef1] bg-white p-3 text-center shadow-sm">
      <Icon size={14} className="mx-auto mb-1 text-gray-400" />
      <p className="text-xs font-bold text-[#16181d]">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles = {
    high: { bg: "#fee2e2", text: RED, label: "วิกฤต" },
    medium: { bg: "#fef9c3", text: "#854d0e", label: "ต่ำ" },
    low: { bg: "#f3f4f6", text: "#6b7280", label: "ปกติ" },
  }
  const s = styles[severity as keyof typeof styles] ?? styles.low
  return (
    <span
      className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}
