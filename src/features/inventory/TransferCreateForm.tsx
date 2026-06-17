"use client"

import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { InventoryFormField } from "@/features/inventory/InventoryFormFields"
import { InventoryLotPicker } from "@/features/inventory/InventoryLotPicker"
import { createTransfer } from "@/features/inventory/actions/transfer"
import { invInputClass } from "@/features/inventory/form-styles"
import type { InvInventoryCreateOptions } from "@/features/inventory/types"

type DraftItem = {
  key: string
  sku_id: string
  qty_sent: string
  lot_id: string
  lot_number: string
}

function newItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    sku_id: "",
    qty_sent: "1",
    lot_id: "",
    lot_number: "",
  }
}

function unitLabel(sku: InvInventoryCreateOptions["skus"][number]) {
  if (!sku.unit_name) return ""
  return sku.unit_abbreviation ? `${sku.unit_name} (${sku.unit_abbreviation})` : sku.unit_name
}

export function TransferCreateForm({ options }: { options: InvInventoryCreateOptions }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fromBranchId, setFromBranchId] = useState("")
  const [toBranchId, setToBranchId] = useState("")
  const [fromWarehouseId, setFromWarehouseId] = useState("")
  const [toWarehouseId, setToWarehouseId] = useState("")
  const [shipper, setShipper] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<DraftItem[]>([newItem()])
  const [error, setError] = useState<string | null>(null)

  const skuById = useMemo(() => new Map(options.skus.map((sku) => [sku.id, sku])), [options.skus])
  const fromWarehouses = fromBranchId
    ? options.warehouses.filter((warehouse) => warehouse.branch_id === fromBranchId)
    : options.warehouses
  const toWarehouses = toBranchId
    ? options.warehouses.filter((warehouse) => warehouse.branch_id === toBranchId)
    : options.warehouses

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function removeItem(key: string) {
    setItems((current) => (current.length > 1 ? current.filter((item) => item.key !== key) : current))
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await createTransfer({
        from_branch_id: fromBranchId,
        to_branch_id: toBranchId,
        from_warehouse_id: fromWarehouseId,
        to_warehouse_id: toWarehouseId,
        shipper,
        notes,
        items: items.map((item) => ({
          sku_id: item.sku_id,
          qty_sent: Number(item.qty_sent),
          lot_id: item.lot_id || null,
          lot_number: item.lot_number || null,
        })),
      })
      if (result.success && result.id) {
        router.push(`/admin/inventory/transfer/${result.id}`)
        router.refresh()
      } else {
        setError(result.error ?? "สร้างใบโอนไม่สำเร็จ")
      }
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
        <InventoryFormField label="สาขาต้นทาง">
          <select className={invInputClass} value={fromBranchId} onChange={(e) => { setFromBranchId(e.target.value); setFromWarehouseId("") }}>
            <option value="" disabled>เลือกสาขา</option>
            {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} — {branch.name}</option>)}
          </select>
        </InventoryFormField>
        <InventoryFormField label="สาขาปลายทาง">
          <select className={invInputClass} value={toBranchId} onChange={(e) => { setToBranchId(e.target.value); setToWarehouseId("") }}>
            <option value="" disabled>เลือกสาขา</option>
            {options.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} — {branch.name}</option>)}
          </select>
        </InventoryFormField>
        <InventoryFormField label="คลังต้นทาง">
          <select className={invInputClass} value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)}>
            <option value="" disabled>เลือกคลัง</option>
            {fromWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} — {warehouse.name}</option>)}
          </select>
        </InventoryFormField>
        <InventoryFormField label="คลังปลายทาง">
          <select className={invInputClass} value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)}>
            <option value="" disabled>เลือกคลัง</option>
            {toWarehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.code} — {warehouse.name}</option>)}
          </select>
        </InventoryFormField>
        <InventoryFormField label="ผู้ขนส่ง">
          <input className={invInputClass} value={shipper} onChange={(e) => setShipper(e.target.value)} />
        </InventoryFormField>
        <InventoryFormField label="หมายเหตุ">
          <input className={invInputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </InventoryFormField>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">รายการสินค้า</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => setItems((current) => [...current, newItem()])}>
            <Plus className="size-4" />
            เพิ่มรายการ
          </Button>
        </div>

        {items.map((item, index) => {
          const sku = skuById.get(item.sku_id)
          return (
            <div key={item.key} className="grid gap-3 rounded-lg border border-border p-3 lg:grid-cols-[1fr_130px_220px_auto]">
              <InventoryFormField label={`SKU #${index + 1}`}>
                <select value={item.sku_id} className={invInputClass} onChange={(e) => updateItem(item.key, { sku_id: e.target.value, lot_id: "", lot_number: "" })}>
                  <option value="" disabled>เลือก SKU</option>
                  {options.skus.map((option) => (
                    <option key={option.id} value={option.id}>{option.code} — {option.name}</option>
                  ))}
                </select>
                {sku ? <p className="mt-1 text-xs text-muted-foreground">หน่วยฐาน: {unitLabel(sku) || "—"}</p> : null}
              </InventoryFormField>
              <InventoryFormField label="จำนวนส่ง">
                <input type="number" min={0.001} step="any" value={item.qty_sent} className={invInputClass} onChange={(e) => updateItem(item.key, { qty_sent: e.target.value })} />
              </InventoryFormField>
              <InventoryFormField label="Lot">
                <InventoryLotPicker
                  skuId={item.sku_id}
                  warehouseId={fromWarehouseId}
                  value={item.lot_id}
                  onChange={(lotId, lot) =>
                    updateItem(item.key, {
                      lot_id: lotId,
                      lot_number: lot?.lot_number ?? "",
                    })
                  }
                />
              </InventoryFormField>
              <div className="flex items-end">
                <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(item.key)} disabled={items.length === 1}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={pending} onClick={submit}>
          {pending ? "กำลังบันทึก..." : "สร้างใบโอน"}
        </Button>
      </div>
    </div>
  )
}
