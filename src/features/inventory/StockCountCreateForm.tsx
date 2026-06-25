"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { CalendarClock, ClipboardList, PackageCheck, Warehouse } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InventoryFormField } from "@/features/inventory/InventoryFormFields"
import {
  createStockCount,
  type InvStockCountCreateOptions,
} from "@/features/inventory/actions/stock-count"
import { invInputClass } from "@/features/inventory/form-styles"

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ClipboardList
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

export function StockCountCreateForm({
  options,
  successBasePath = "/admin/inventory/stock-count",
}: {
  options: InvStockCountCreateOptions
  successBasePath?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [branchId, setBranchId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [plannedAt, setPlannedAt] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  const warehouses = useMemo(() => {
    if (!branchId) return options.warehouses
    return options.warehouses.filter((warehouse) => warehouse.branch_id === branchId)
  }, [branchId, options.warehouses])

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await createStockCount({
        branch_id: branchId,
        warehouse_id: warehouseId,
        scope: "all",
        planned_at: plannedAt || undefined,
        notes: notes || undefined,
      })
      if (result.success && result.id) {
        router.push(`${successBasePath}/${result.id}`)
        router.refresh()
      } else {
        setError(result.error ?? "สร้างแผนตรวจนับไม่สำเร็จ")
      }
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        ใช้หน้านี้ตอนเริ่มรอบตรวจนับ: เลือกสาขา เลือกคลัง กำหนดวัน แล้วค่อยสร้างรอบเพื่อให้ทีมเริ่มนับจากข้อมูลตั้งต้นเดียวกัน
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="ขอบเขต"
          value="ทุกรายการสต็อก"
          hint="ดึงทุก SKU ที่มีข้อมูลคงเหลือในคลังที่เลือกมาเป็นข้อมูลตั้งต้น"
        />
        <SummaryCard
          icon={Warehouse}
          label="สาขา / คลัง"
          value={branchId && warehouseId ? "เลือกแล้ว" : "รอเลือก"}
          hint="เลือกให้ครบก่อนสร้างรอบเพื่อล็อกขอบเขตของการนับ"
        />
        <SummaryCard
          icon={CalendarClock}
          label="วันที่วางแผน"
          value={plannedAt || "ยังไม่ระบุ"}
          hint="ใช้เป็นวันนัดหมายหรือรอบที่ต้องการให้ทีมเริ่มนับ"
        />
        <SummaryCard
          icon={PackageCheck}
          label="ผลลัพธ์หลังปิดรอบ"
          value="รายการปรับสต็อก"
          hint="ส่วนต่างจะถูกสร้างเป็นรายการปรับสต็อกหลังปิดรอบ"
        />
      </div>

      <div className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
        <InventoryFormField label="สาขา">
          <select
            className={invInputClass}
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value)
              setWarehouseId("")
            }}
          >
            <option value="" disabled>
              เลือกสาขา
            </option>
            {options.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} — {branch.name}
              </option>
            ))}
          </select>
        </InventoryFormField>

        <InventoryFormField label="คลังสินค้า">
          <select
            className={invInputClass}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="" disabled>
              เลือกคลัง
            </option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        </InventoryFormField>

        <InventoryFormField label="ขอบเขต">
          <input className={invInputClass} value="ทุก SKU ที่มีข้อมูลคงเหลือในคลังที่เลือก" readOnly />
        </InventoryFormField>

        <InventoryFormField label="วันที่วางแผน">
          <input
            type="date"
            className={invInputClass}
            value={plannedAt}
            onChange={(e) => setPlannedAt(e.target.value)}
          />
        </InventoryFormField>

        <InventoryFormField label="หมายเหตุ" className="md:col-span-2">
          <textarea
            className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            placeholder="อธิบายรอบตรวจนับหรือข้อสังเกต"
          />
        </InventoryFormField>
      </div>

      <div className="grid gap-2 rounded-xl border border-border/80 bg-card p-4 text-sm md:grid-cols-2">
        <p>
          <span className="font-medium">สาขาที่เลือก:</span>{" "}
          {branchId
            ? options.branches.find((branch) => branch.id === branchId)?.name ?? "—"
            : "ยังไม่ได้เลือก"}
        </p>
        <p>
          <span className="font-medium">คลังที่เลือก:</span>{" "}
          {warehouseId
            ? warehouses.find((warehouse) => warehouse.id === warehouseId)?.name ?? "—"
            : "ยังไม่ได้เลือก"}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        รอบนี้จะใช้เฉพาะ SKU ที่มีข้อมูลคงเหลืออยู่แล้วในคลังที่เลือก และจะสร้างรายการปรับสต็อกตอนปิดรอบเท่านั้น
      </div>

      <div className="flex justify-end">
        <Button type="button" className="w-full md:w-auto" disabled={pending} onClick={submit}>
          {pending ? "กำลังสร้าง..." : "สร้างแผนตรวจนับ"}
        </Button>
      </div>
    </div>
  )
}
