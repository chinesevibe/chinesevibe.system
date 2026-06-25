"use client"

import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { InventoryFormField } from "@/features/inventory/InventoryFormFields"
import { createRequisition } from "@/features/inventory/actions/requisition"
import type { InvRequisitionCreateOptions } from "@/features/inventory/types"
import { invInputClass } from "@/features/inventory/form-styles"

type DraftItem = {
  key: string
  sku_id: string
  qty_requested: string
  notes: string
}

function newItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    sku_id: "",
    qty_requested: "1",
    notes: "",
  }
}

function unitLabel(sku: InvRequisitionCreateOptions["skus"][number]) {
  if (!sku.unit_name) return ""
  return sku.unit_abbreviation
    ? `${sku.unit_name} (${sku.unit_abbreviation})`
    : sku.unit_name
}

export function RequisitionCreateForm({
  options,
  successBasePath = "/admin/inventory/requisition",
  cancelPath = "/admin/inventory/requisition",
}: {
  options: InvRequisitionCreateOptions
  successBasePath?: string
  cancelPath?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [branchId, setBranchId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<DraftItem[]>([newItem()])
  const [error, setError] = useState<string | null>(null)

  const skuById = useMemo(
    () => new Map(options.skus.map((sku) => [sku.id, sku])),
    [options.skus]
  )

  const filteredWarehouses = branchId
    ? options.warehouses.filter((warehouse) => warehouse.branch_id === branchId)
    : options.warehouses

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item))
    )
  }

  function removeItem(key: string) {
    setItems((current) =>
      current.length > 1 ? current.filter((item) => item.key !== key) : current
    )
  }

  function submit() {
    setError(null)
    const payload = {
      branch_id: branchId,
      warehouse_id: warehouseId,
      notes,
      items: items.map((item) => ({
        sku_id: item.sku_id,
        qty_requested: Number(item.qty_requested),
        notes: item.notes,
      })),
    }

    startTransition(async () => {
      const result = await createRequisition(payload)
      if (result.success && result.id) {
        router.push(`${successBasePath}/${result.id}`)
        router.refresh()
      } else {
        setError(result.error ?? "สร้างใบเบิกไม่สำเร็จ")
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
        <InventoryFormField label="สาขาครัว" htmlFor="branch_id">
          <select
            id="branch_id"
            name="branch_id"
            value={branchId}
            required
            className={invInputClass}
            onChange={(event) => {
              setBranchId(event.target.value)
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

        <InventoryFormField label="คลังที่ขอเบิก" htmlFor="warehouse_id">
          <select
            id="warehouse_id"
            name="warehouse_id"
            value={warehouseId}
            required
            className={invInputClass}
            onChange={(event) => setWarehouseId(event.target.value)}
          >
            <option value="" disabled>
              เลือกคลัง
            </option>
            {filteredWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name} ({warehouse.branch_name})
              </option>
            ))}
          </select>
        </InventoryFormField>

        <InventoryFormField
          label="หมายเหตุ"
          htmlFor="notes"
          className="md:col-span-2"
        >
          <textarea
            id="notes"
            rows={3}
            className={invInputClass}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </InventoryFormField>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">รายการขอเบิก</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setItems((current) => [...current, newItem()])}
          >
            <Plus className="size-4" />
            เพิ่มรายการ
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const sku = skuById.get(item.sku_id)
            return (
              <div
                key={item.key}
                className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_160px_1fr_auto]"
              >
                <InventoryFormField label={`สินค้า #${index + 1}`}>
                  <select
                    value={item.sku_id}
                    required
                    className={invInputClass}
                    onChange={(event) =>
                      updateItem(item.key, { sku_id: event.target.value })
                    }
                  >
                    <option value="" disabled>
                      เลือก SKU
                    </option>
                    {options.skus.map((skuOption) => (
                      <option key={skuOption.id} value={skuOption.id}>
                        {skuOption.code} — {skuOption.name}
                      </option>
                    ))}
                  </select>
                  {sku ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      หน่วยฐาน: {unitLabel(sku) || "—"}
                    </p>
                  ) : null}
                </InventoryFormField>

                <InventoryFormField label="จำนวน">
                  <input
                    type="number"
                    min={0.001}
                    step="any"
                    value={item.qty_requested}
                    className={invInputClass}
                    onChange={(event) =>
                      updateItem(item.key, {
                        qty_requested: event.target.value,
                      })
                    }
                  />
                </InventoryFormField>

                <InventoryFormField label="หมายเหตุรายการ">
                  <input
                    value={item.notes}
                    className={invInputClass}
                    onChange={(event) =>
                      updateItem(item.key, { notes: event.target.value })
                    }
                  />
                </InventoryFormField>

                <div className="flex items-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={items.length === 1}
                    onClick={() => removeItem(item.key)}
                  >
                    <Trash2 className="size-4" />
                    ลบ
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" className="w-full sm:w-auto" disabled={pending} onClick={submit}>
          {pending ? "กำลังสร้าง…" : "สร้างใบเบิก"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={pending}
          onClick={() => router.push(cancelPath)}
        >
          ยกเลิก
        </Button>
      </div>
    </div>
  )
}
