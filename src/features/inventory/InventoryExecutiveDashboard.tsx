"use client"

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

import { WidgetCard } from "@/components/brand/WidgetCard"
import type { InventoryDashboardData } from "@/features/inventory/expansion-data"

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

export function InventoryExecutiveDashboard({ data }: { data: InventoryDashboardData }) {
  const { kpis } = data
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="มูลค่าสต๊อกคงเหลือ" value={kpis.totalStockValue} />
        <KpiCard label="จำนวน SKU" value={kpis.skuCount} />
        <KpiCard label="ต่ำกว่า Min" value={kpis.belowMinCount} />
        <KpiCard label="ใกล้หมดอายุ 7 วัน" value={kpis.expiry7dCount} />
        <KpiCard label="รับเข้าเดือนนี้" value={kpis.inboundValueMtd} />
        <KpiCard label="ใช้จริงเดือนนี้" value={kpis.consumptionValueMtd} />
        <KpiCard label="เสียหายเดือนนี้" value={kpis.damageValueMtd} />
        <KpiCard label="ใบเบิกรออนุมัติ" value={kpis.pendingRequisitions} />
        <KpiCard label="ใบโอนกำลังส่ง" value={kpis.inTransitTransfers} />
        <KpiCard label="Damage รอตัดสิน" value={kpis.pendingDamageApprovals} />
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
