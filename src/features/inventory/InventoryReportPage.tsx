import { AdminPageShell } from "@/components/brand/AdminPageShell"
import {
  getInventoryFilterOptions,
  getInventoryReport,
  type InventoryReportKind,
} from "@/features/inventory/expansion-data"
import { InventoryFilterBar } from "@/features/inventory/InventoryFilterBar"
import { InventoryReportTable } from "@/features/inventory/InventoryReportTable"
import type { InventoryPageFilters } from "@/features/inventory/inventory-filter-utils"

const REPORT_DECISION_HINTS: Record<InventoryReportKind, string> = {
  stock: "ใช้ดูของคงเหลือแยกสาขาและคลัง ก่อนตัดสินใจเติมของหรือย้ายของ",
  inbound: "ใช้ตรวจงานรับเข้า เทียบ supplier และหา receiving ที่ยังค้าง",
  requisition: "ใช้ตามการเบิกของจากต้นทางไปปลายทาง พร้อมดูสถานะที่ยังต้องจัดการ",
  consumption: "ใช้ดูการใช้จริง เพื่อเทียบกับแผนและหาจุดใช้เกิน",
  damage: "ใช้ดูรายการเสียหายและเหตุผล เพื่อไล่หาจุดสูญเสีย",
  transfer: "ใช้ดูการโอนระหว่างสาขา ว่าต้นทางส่งแล้ว ปลายทางรับหรือยัง",
  variance: "ใช้ดูผลต่างจาก stock count เพื่อหาของขาด เกิน หรือบันทึกไม่ตรง",
  audit: "ใช้ตรวจย้อนหลังว่าใครทำอะไร เมื่อไร ในเส้นทาง inventory",
}

export async function InventoryReportPage({
  kind,
  title,
  description,
  filters = {},
}: {
  kind: InventoryReportKind
  title: string
  description: string
  filters?: InventoryPageFilters
}) {
  const [result, options] = await Promise.all([
    getInventoryReport(kind, filters),
    getInventoryFilterOptions(),
  ])

  return (
    <AdminPageShell title={title} description={description}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/80 bg-muted/15 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Decision focus
          </p>
          <p className="mt-2 text-sm text-foreground">{REPORT_DECISION_HINTS[kind]}</p>
        </div>
        <InventoryFilterBar options={options} showDates />
        <InventoryReportTable
          title={title}
          filename={`inventory-${kind}.csv`}
          headers={result.headers}
          rows={result.rows}
          summary={result.summary}
        />
      </div>
    </AdminPageShell>
  )
}
