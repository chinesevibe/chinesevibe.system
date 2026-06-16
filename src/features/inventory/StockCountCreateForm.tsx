"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { InventoryFormField } from "@/features/inventory/InventoryFormFields"
import {
  createStockCount,
  type InvStockCountCreateOptions,
} from "@/features/inventory/actions/stock-count"
import { invInputClass } from "@/features/inventory/form-styles"

export function StockCountCreateForm({
  options,
}: {
  options: InvStockCountCreateOptions
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
        router.push(`/admin/inventory/stock-count/${result.id}`)
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
          <input className={invInputClass} value="ทุก SKU ที่มี stock balance row" readOnly />
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

      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        รอบ v1 จะ snapshot เฉพาะ SKU ที่มี `inv_stock_balances` อยู่แล้วในคลังที่เลือก และจะสร้าง adjustment ตอน finalize เท่านั้น
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={pending} onClick={submit}>
          {pending ? "กำลังสร้าง..." : "สร้างแผนตรวจนับ"}
        </Button>
      </div>
    </div>
  )
}
