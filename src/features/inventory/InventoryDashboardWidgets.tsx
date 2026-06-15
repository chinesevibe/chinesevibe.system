import { AlertTriangle, Package, PackageX, Truck } from "lucide-react"

import { WidgetCard } from "@/components/brand/WidgetCard"
import { cn } from "@/lib/utils"

import type { InventoryDashboardSummary } from "./report-data"

function MetricHero({
  value,
  accent,
}: {
  value: number
  accent: "amber" | "warning" | "destructive"
}) {
  const accentClass = {
    amber: "text-amber-600",
    warning: "text-orange-600",
    destructive: "text-red-600",
  }[accent]

  return (
    <p className={cn("text-3xl font-semibold tabular-nums leading-none", accentClass)}>
      {value.toLocaleString()}
    </p>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-xs text-muted-foreground">{children}</p>
}

export function InventoryLowStockWidget({
  summary,
}: {
  summary: InventoryDashboardSummary
}) {
  return (
    <WidgetCard compact title="สต็อกต่ำกว่า Min" href="/admin/inventory/sku" actionLabel="ดู SKU">
      <div className="flex items-start gap-2">
        <Package className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <MetricHero value={summary.lowStockCount} accent="amber" />
          <p className="mt-1 text-[10px] text-muted-foreground">SKU ที่คงเหลือต่ำกว่าขั้นต่ำ</p>
        </div>
      </div>
      {!summary.hasStockData ? (
        <EmptyHint>ยังไม่มีข้อมูลสต็อก — ตั้งค่า master data ที่คลังสินค้า</EmptyHint>
      ) : summary.lowStockRows.length === 0 ? (
        <EmptyHint>ไม่มี SKU ต่ำกว่า Min</EmptyHint>
      ) : (
        <ul className="mt-2 divide-y divide-border/60 border-t border-border/60 pt-2">
          {summary.lowStockRows.map((row) => (
            <li key={row.code} className="flex items-start justify-between gap-2 py-1.5 text-[11px]">
              <div className="min-w-0">
                <p className="truncate font-medium">{row.code}</p>
                <p className="truncate text-[10px] text-muted-foreground">{row.name}</p>
              </div>
              <span className="shrink-0 tabular-nums text-amber-700">
                {row.qty}/{row.minStock}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}

export function InventoryPendingInboundWidget({
  summary,
}: {
  summary: InventoryDashboardSummary
}) {
  return (
    <WidgetCard compact title="ใบรับเข้าเปิดสแกน" href="/admin/inventory/inbound" actionLabel="ดูทั้งหมด">
      <div className="flex items-start gap-2">
        <Truck className="mt-0.5 size-4 shrink-0 text-orange-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <MetricHero value={summary.pendingInboundCount} accent="warning" />
          <p className="mt-1 text-[10px] text-muted-foreground">รอคลังสแกน / Inventory ตรวจอนุมัติ</p>
        </div>
      </div>
      {summary.pendingInboundRows.length === 0 ? (
        <EmptyHint>ยังไม่มีใบเปิดรับสแกน</EmptyHint>
      ) : (
        <ul className="mt-2 divide-y divide-border/60 border-t border-border/60 pt-2">
          {summary.pendingInboundRows.map((row) => (
            <li key={row.id} className="py-1.5 text-[11px]">
              <p className="truncate font-medium">{row.supplierName}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {row.warehouseName} · {row.createdAt}
              </p>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}

export function InventoryZeroStockWidget({
  summary,
}: {
  summary: InventoryDashboardSummary
}) {
  return (
    <WidgetCard compact title="สต็อกหมด (0)" href="/admin/inventory/sku" actionLabel="ดู SKU">
      <div className="flex items-start gap-2">
        <PackageX className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <MetricHero value={summary.zeroStockCount} accent="destructive" />
          <p className="mt-1 text-[10px] text-muted-foreground">SKU ที่ใช้งานแต่ไม่มียอดคงเหลือ</p>
        </div>
      </div>
      {summary.zeroStockRows.length === 0 ? (
        <EmptyHint>
          {summary.hasStockData ? "ไม่มี SKU สต็อกหมด" : "ยังไม่มี SKU ที่เปิดใช้งาน"}
        </EmptyHint>
      ) : (
        <ul className="mt-2 divide-y divide-border/60 border-t border-border/60 pt-2">
          {summary.zeroStockRows.map((row) => (
            <li key={row.code} className="flex items-start gap-1.5 py-1.5 text-[11px]">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-red-500" aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-medium">{row.code}</p>
                <p className="truncate text-[10px] text-muted-foreground">{row.name}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
