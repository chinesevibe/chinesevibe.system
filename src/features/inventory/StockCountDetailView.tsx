"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, PackageCheck, ScanSearch, TriangleAlert } from "lucide-react"

import { StatusPill } from "@/components/brand/StatusPill"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  cancelStockCount,
  finalizeStockCount,
  saveStockCountItems,
  startStockCount,
  type InvStockCountDetail,
} from "@/features/inventory/actions/stock-count"
import { formatThaiDate, formatThaiDateTime } from "@/lib/datetime/thailand"

function formatQuantity(value: number | null) {
  if (value == null) return "—"
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

function unitLabel(item: { unit_name: string | null; unit_abbreviation: string | null }) {
  if (!item.unit_name) return ""
  return item.unit_abbreviation ? `${item.unit_name} (${item.unit_abbreviation})` : item.unit_name
}

function statusVariant(status: InvStockCountDetail["count"]["status"]) {
  if (status === "completed") return "approved" as const
  if (status === "counting") return "pending" as const
  if (status === "cancelled") return "rejected" as const
  return "neutral" as const
}

const STATUS_LABELS: Record<InvStockCountDetail["count"]["status"], string> = {
  draft: "ร่าง",
  counting: "กำลังนับ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ScanSearch
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-brand-red">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

export function StockCountDetailView({
  detail,
  canManage,
}: {
  detail: InvStockCountDetail
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [physicalQty, setPhysicalQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      detail.items.map((item) => [item.id, item.physical_qty == null ? "" : String(item.physical_qty)]),
    ),
  )

  const countedItems = useMemo(
    () => detail.items.filter((item) => physicalQty[item.id]?.trim() !== "").length,
    [detail.items, physicalQty],
  )
  const varianceItems = useMemo(
    () => detail.items.filter((item) => {
      const raw = physicalQty[item.id]
      if (!raw?.trim()) return false
      return Number(raw) !== item.system_qty
    }).length,
    [detail.items, physicalQty],
  )
  const completedVarianceCount = useMemo(
    () =>
      detail.items.filter((item) => item.physical_qty != null && item.physical_qty !== item.system_qty).length,
    [detail.items],
  )

  function buildSavePayload() {
    return detail.items.map((item) => {
      const raw = physicalQty[item.id] ?? ""
      return {
        id: item.id,
        physical_qty: raw.trim() === "" ? null : Number(raw),
      }
    })
  }

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error ?? "ดำเนินการไม่สำเร็จ")
      }
    })
  }

  function saveDraftCounts() {
    runAction(() => saveStockCountItems({ count_id: detail.count.id, items: buildSavePayload() }))
  }

  function finalizeWithLatestValues() {
    setError(null)
    startTransition(async () => {
      const saveResult = await saveStockCountItems({
        count_id: detail.count.id,
        items: buildSavePayload(),
      })
      if (!saveResult.success) {
        setError(saveResult.error ?? "บันทึกจำนวนจริงไม่สำเร็จ")
        return
      }

      const finalizeResult = await finalizeStockCount({ count_id: detail.count.id })
      if (finalizeResult.success) {
        router.refresh()
      } else {
        setError(finalizeResult.error ?? "ปิดรอบตรวจนับไม่สำเร็จ")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="สถานะรอบนับ"
          value={STATUS_LABELS[detail.count.status]}
          hint="ไหลจาก draft → counting → completed"
        />
        <SummaryCard
          icon={ScanSearch}
          label="กรอกแล้ว"
          value={`${countedItems} / ${detail.items.length}`}
          hint="ใช้ดูความคืบหน้าของ physical qty ในรอบนี้"
        />
        <SummaryCard
          icon={TriangleAlert}
          label="Variance ชั่วคราว"
          value={String(detail.count.status === "completed" ? completedVarianceCount : varianceItems)}
          hint="จำนวน SKU ที่ physical ไม่เท่ากับ system"
        />
        <SummaryCard
          icon={PackageCheck}
          label="ขอบเขต"
          value={detail.count.warehouse_name}
          hint={`สาขา ${detail.count.branch_name} · ทุก SKU ที่มี stock balance row`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusPill label={STATUS_LABELS[detail.count.status]} variant={statusVariant(detail.count.status)} />
        <span className="text-sm text-muted-foreground">
          สร้าง {formatThaiDateTime(detail.count.created_at)}
          {detail.count.planned_at ? ` · วางแผน ${formatThaiDate(detail.count.planned_at)}` : ""}
          {detail.count.started_at ? ` · เริ่ม ${formatThaiDateTime(detail.count.started_at)}` : ""}
          {detail.count.completed_at ? ` · ปิดรอบ ${formatThaiDateTime(detail.count.completed_at)}` : ""}
        </span>
      </div>

      <div className="grid gap-2 rounded-xl border border-border p-4 text-sm md:grid-cols-2">
        <p>
          <span className="font-medium">สาขา:</span> {detail.count.branch_name}
        </p>
        <p>
          <span className="font-medium">คลัง:</span> {detail.count.warehouse_name}
        </p>
        <p>
          <span className="font-medium">ผู้สร้าง:</span> {detail.count.created_by_name}
        </p>
        <p>
          <span className="font-medium">ขอบเขต:</span> ทุก SKU ที่มี stock balance row
        </p>
        <p>
          <span className="font-medium">รายการทั้งหมด:</span> {detail.items.length}
        </p>
        <p>
          <span className="font-medium">กรอกแล้ว:</span> {countedItems} / {detail.items.length}
        </p>
        {detail.count.notes ? (
          <p className="md:col-span-2">
            <span className="font-medium">หมายเหตุ:</span> {detail.count.notes}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">รายการตรวจนับ</h2>
            <p className="text-sm text-muted-foreground">
              ระหว่างนับสามารถบันทึกซ้ำได้หลายครั้ง และ finalize ได้เมื่อกรอกครบทุก SKU
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Variance ชั่วคราว: {detail.count.status === "completed" ? completedVarianceCount : varianceItems} รายการ
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Physical</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>ผู้บันทึก</TableHead>
                <TableHead>เวลา</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.items.map((item) => {
                const raw = physicalQty[item.id] ?? ""
                const physical = raw.trim() === "" ? null : Number(raw)
                const variance = physical == null ? null : physical - item.system_qty

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku_code}</TableCell>
                    <TableCell>{item.sku_name}</TableCell>
                    <TableCell>
                      {formatQuantity(item.system_qty)} {unitLabel(item)}
                    </TableCell>
                    <TableCell className="min-w-36">
                      {detail.count.status === "counting" && canManage ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className="h-9 w-full rounded-lg border border-input px-3 text-sm"
                          value={raw}
                          onChange={(e) =>
                            setPhysicalQty((current) => ({
                              ...current,
                              [item.id]: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        formatQuantity(item.physical_qty)
                      )}
                    </TableCell>
                    <TableCell>{variance == null ? "—" : formatQuantity(variance)}</TableCell>
                    <TableCell>{item.counted_by_name ?? "—"}</TableCell>
                    <TableCell>{item.counted_at ? formatThaiDateTime(item.counted_at) : "—"}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {detail.count.status === "draft" && canManage ? (
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">เริ่มรอบตรวจนับ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            เมื่อเริ่มแล้วสถานะจะเปลี่ยนเป็นกำลังนับ และทีมสามารถกรอกจำนวนจริงได้
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => runAction(() => startStockCount({ count_id: detail.count.id }))}>
              เริ่มนับ
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => runAction(() => cancelStockCount({ count_id: detail.count.id }))}
            >
              ยกเลิกรอบตรวจนับ
            </Button>
          </div>
        </section>
      ) : null}

      {detail.count.status === "counting" && canManage ? (
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">บันทึกผลนับจริง</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            กดบันทึกเพื่อเก็บความคืบหน้า หรือ finalize เพื่อสร้าง adjustment และอัปเดต stock movement
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={pending || countedItems === 0} onClick={saveDraftCounts}>
              บันทึกความคืบหน้า
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={finalizeWithLatestValues}
            >
              Finalize รอบตรวจนับ
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => runAction(() => cancelStockCount({ count_id: detail.count.id }))}
            >
              ยกเลิกรอบตรวจนับ
            </Button>
          </div>
        </section>
      ) : null}

      {detail.count.status === "completed" ? (
        <section className="space-y-3 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">Adjustment ที่สร้างแล้ว</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              แสดงเฉพาะ SKU ที่มี variance ไม่เท่ากับ 0 หลัง finalize
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>เวลา apply</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      ไม่มี variance ในรอบนี้
                    </TableCell>
                  </TableRow>
                ) : (
                  detail.adjustments.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sku_code}</TableCell>
                      <TableCell>{item.sku_name}</TableCell>
                      <TableCell>
                        {formatQuantity(item.qty_delta)} {unitLabel(item)}
                      </TableCell>
                      <TableCell>{item.status === "applied" ? "Applied" : item.status}</TableCell>
                      <TableCell>{item.applied_at ? formatThaiDateTime(item.applied_at) : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
