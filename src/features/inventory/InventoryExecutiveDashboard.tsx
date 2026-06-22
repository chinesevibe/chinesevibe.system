"use client"

import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  PackagePlus,
  ScanSearch,
  ShieldAlert,
  Truck,
} from "lucide-react"

import { StatusPill } from "@/components/brand/StatusPill"
import { WidgetCard } from "@/components/brand/WidgetCard"
import type {
  InventoryAlertRow,
  InventoryDashboardData,
} from "@/features/inventory/expansion-data"

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"]

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(value)
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(value)}</p>
    </div>
  )
}

function ActionCard({
  href,
  icon,
  label,
  value,
  hint,
}: {
  href: string
  icon: React.ReactNode
  label: string
  value: number
  hint: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-brand-red">
          {icon}
        </div>
        <ArrowUpRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-red"
          aria-hidden
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {formatMoney(value)}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </Link>
  )
}

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

function ActionInbox({ rows }: { rows: InventoryAlertRow[] }) {
  return (
    <WidgetCard title="Alert / Action inbox">
      {rows.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="group rounded-xl border border-border/70 bg-muted/10 p-4 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-sm"
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
          ยังไม่มี alert ค้างใน scope ที่เลือก
        </div>
      )}
    </WidgetCard>
  )
}

export function InventoryExecutiveDashboard({
  data,
  alerts,
}: {
  data: InventoryDashboardData
  alerts: InventoryAlertRow[]
}) {
  const { kpis } = data
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <WidgetCard title="Today operations summary">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ActionCard
              href="/admin/inventory/stock?below_min=1"
              icon={<ShieldAlert className="size-5" aria-hidden />}
              label="ต่ำกว่า Min"
              value={kpis.belowMinCount}
              hint="SKU ที่ควรเช็คเติมสต๊อกหรือเปิดดูสาขาที่ค้าง"
            />
            <ActionCard
              href="/admin/inventory/alerts?type=expiry"
              icon={<AlertTriangle className="size-5" aria-hidden />}
              label="ใกล้หมดอายุ 7 วัน"
              value={kpis.expiry7dCount}
              hint="lot ที่ควรผลักออกก่อนหรือเร่งใช้ก่อนหมดอายุ"
            />
            <ActionCard
              href="/admin/inventory/requisition"
              icon={<ClipboardList className="size-5" aria-hidden />}
              label="ใบเบิกรออนุมัติ"
              value={kpis.pendingRequisitions}
              hint="ตรวจคำขอเบิกจากครัวและเปิดดูรายการที่รอจัดสินค้า"
            />
            <ActionCard
              href="/admin/inventory/transfer"
              icon={<Truck className="size-5" aria-hidden />}
              label="ใบโอนกำลังส่ง"
              value={kpis.inTransitTransfers}
              hint="ติดตามการโอนระหว่างสาขาและเช็คการรับเข้าปลายทาง"
            />
            <ActionCard
              href="/admin/inventory/damage"
              icon={<AlertTriangle className="size-5" aria-hidden />}
              label="Damage รอตัดสิน"
              value={kpis.pendingDamageApprovals}
              hint="รายการเสียหายที่ยังต้องตรวจสอบและอนุมัติ"
            />
            <ActionCard
              href="/admin/inventory/stock-count"
              icon={<ScanSearch className="size-5" aria-hidden />}
              label="มูลค่าสต๊อกคงเหลือ"
              value={kpis.totalStockValue}
              hint="ใช้เป็นภาพรวมของ scope ปัจจุบันก่อนเปิดดู stock workspace"
            />
          </div>
        </WidgetCard>

        <WidgetCard title="Quick actions">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <ActionCard
              href="/admin/inventory/inbound"
              icon={<PackagePlus className="size-5" aria-hidden />}
              label="รับเข้า"
              value={kpis.inboundValueMtd}
              hint="เปิดใบรับ สแกนสินค้า และตรวจรายการรับเข้าของเดือนนี้"
            />
            <ActionCard
              href="/admin/inventory/requisition"
              icon={<ClipboardList className="size-5" aria-hidden />}
              label="Issue to kitchen"
              value={kpis.consumptionValueMtd}
              hint="ติดตามการเบิกและการใช้จริงของเดือนนี้จากหน้า issue/requisition"
            />
            <ActionCard
              href="/admin/inventory/transfer"
              icon={<Truck className="size-5" aria-hidden />}
              label="Transfer branch"
              value={kpis.damageValueMtd}
              hint="สลับไปหน้าโอนสินค้าเพื่อดูงานเคลื่อนย้ายระหว่างสาขา"
            />
          </div>
        </WidgetCard>
      </div>

      <ActionInbox rows={alerts} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="จำนวน SKU" value={kpis.skuCount} />
        <KpiCard label="รับเข้าเดือนนี้" value={kpis.inboundValueMtd} />
        <KpiCard label="ใช้จริงเดือนนี้" value={kpis.consumptionValueMtd} />
        <KpiCard label="เสียหายเดือนนี้" value={kpis.damageValueMtd} />
        <KpiCard label="มูลค่าสต๊อกคงเหลือ" value={kpis.totalStockValue} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WidgetCard title="มูลค่าสต๊อก 30 วัน">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.stockValueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </WidgetCard>
        <WidgetCard title="รับเข้า vs ใช้จริง 12 สัปดาห์">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.inboundVsConsumption}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="inbound" fill="#2563eb" />
                <Bar dataKey="consumption" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetCard>
        <WidgetCard title="มูลค่าเสียหาย 6 เดือน">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.damageTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="damage" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetCard>
        <WidgetCard title="สัดส่วนมูลค่าสต๊อกตามหมวดหมู่">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.categoryShare} dataKey="value" nameKey="name" outerRadius={100} label>
                  {data.categoryShare.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </WidgetCard>
      </div>
    </div>
  )
}
