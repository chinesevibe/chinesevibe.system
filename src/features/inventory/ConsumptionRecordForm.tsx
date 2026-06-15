"use client"

import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { InventoryFormField } from "@/features/inventory/InventoryFormFields"
import { recordConsumption } from "@/features/inventory/actions/consumption"
import { invInputClass } from "@/features/inventory/form-styles"
import type {
  InvConsumptionType,
  InvInventoryCreateOptions,
} from "@/features/inventory/types"

type DraftItem = {
  key: string
  sku_id: string
  qty: string
  consumption_type: InvConsumptionType
  notes: string
}

const TYPE_LABELS: Record<InvConsumptionType, string> = {
  production: "ผลิต/ใช้งานจริง",
  sampling: "ทดลองชิม/ตัวอย่าง",
  testing: "ทดสอบ",
}

function newItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    sku_id: "",
    qty: "1",
    consumption_type: "production",
    notes: "",
  }
}

function unitLabel(sku: InvInventoryCreateOptions["skus"][number]) {
  if (!sku.unit_name) return ""
  return sku.unit_abbreviation
    ? `${sku.unit_name} (${sku.unit_abbreviation})`
    : sku.unit_name
}

export function ConsumptionRecordForm({
  options,
}: {
  options: InvInventoryCreateOptions
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [branchId, setBranchId] = useState("")
  const [warehouseId, setWarehouseId] = useState("")
  const [notes, setNotes] = useState("")
  const [items, setItems] = useState<DraftItem[]>([newItem()])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    setSuccess(null)
    startTransition(async () => {
      const result = await recordConsumption({
        branch_id: branchId,
        warehouse_id: warehouseId,
        notes,
        items: items.map((item) => ({
          sku_id: item.sku_id,
          qty: Number(item.qty),
          consumption_type: item.consumption_type,
          notes: item.notes,
        })),
      })

      if (result.success) {
        setItems([newItem()])
        setNotes("")
        setSuccess(`บันทึกการใช้จริงแล้ว ${result.ids?.length ?? 0} รายการ`)
        router.refresh()
      } else {
        setError(result.error ?? "บันทึกการใช้จริงไม่สำเร็จ")
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
      {success ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-2">
        <InventoryFormField label="สาขา" htmlFor="branch_id">
          <select
            id="branch_id"
            value={branchId}
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

        <InventoryFormField label="คลังสินค้า" htmlFor="warehouse_id">
          <select
            id="warehouse_id"
            value={warehouseId}
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
          label="หมายเหตุรวม"
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
          <h2 className="text-sm font-semibold">รายการใช้จริง</h2>
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

        {items.map((item, index) => {
          const sku = skuById.get(item.sku_id)
          return (
            <div
              key={item.key}
              className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_130px_180px_1fr_auto]"
            >
              <InventoryFormField label={`SKU #${index + 1}`}>
                <select
                  value={item.sku_id}
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
                  value={item.qty}
                  className={invInputClass}
                  onChange={(event) =>
                    updateItem(item.key, { qty: event.target.value })
                  }
                />
              </InventoryFormField>

              <InventoryFormField label="ประเภท">
                <select
                  value={item.consumption_type}
                  className={invInputClass}
                  onChange={(event) =>
                    updateItem(item.key, {
                      consumption_type: event.target.value as InvConsumptionType,
                    })
                  }
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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

      <Button type="button" disabled={pending} onClick={submit}>
        {pending ? "กำลังบันทึก…" : "บันทึกการใช้จริง"}
      </Button>
    </div>
  )
}
