"use client"

import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { InventoryFormField } from "@/features/inventory/InventoryFormFields"
import {
  createDamageReport,
  uploadDamagePhoto,
} from "@/features/inventory/actions/consumption"
import { invInputClass } from "@/features/inventory/form-styles"
import type {
  InvDamageType,
  InvInventoryCreateOptions,
} from "@/features/inventory/types"

type DraftItem = {
  key: string
  sku_id: string
  qty: string
  damage_type: InvDamageType
  reason: string
  notes: string
  file: File | null
  previewUrl: string | null
}

const DAMAGE_TYPE_LABELS: Record<InvDamageType, string> = {
  damaged: "เสียหาย",
  spoiled: "เน่าเสีย",
  expired: "หมดอายุ",
  lost: "สูญหาย",
  adjustment: "ปรับปรุงสต็อก",
}

function newItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    sku_id: "",
    qty: "1",
    damage_type: "damaged",
    reason: "",
    notes: "",
    file: null,
    previewUrl: null,
  }
}

function unitLabel(sku: InvInventoryCreateOptions["skus"][number]) {
  if (!sku.unit_name) return ""
  return sku.unit_abbreviation
    ? `${sku.unit_name} (${sku.unit_abbreviation})`
    : sku.unit_name
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function thresholdLabel(value: number | null) {
  if (value == null) return "ยังไม่มีต้นทุนล่าสุด"
  if (value <= 500) return "คาดว่าจะอนุมัติอัตโนมัติ"
  if (value > 5000) return "คาดว่าจะรอ Admin"
  return "คาดว่าจะรอ HR"
}

export function DamageCreateForm({
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

  const skuById = useMemo(
    () => new Map(options.skus.map((sku) => [sku.id, sku])),
    [options.skus]
  )

  const filteredWarehouses = branchId
    ? options.warehouses.filter((warehouse) => warehouse.branch_id === branchId)
    : options.warehouses

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item
        if (patch.previewUrl && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
        return { ...item, ...patch }
      })
    )
  }

  function removeItem(key: string) {
    setItems((current) => {
      const target = current.find((item) => item.key === key)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return current.length > 1
        ? current.filter((item) => item.key !== key)
        : current
    })
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const uploadedPaths: Record<string, string | null> = {}
      for (const item of items) {
        if (!item.file) {
          uploadedPaths[item.key] = null
          continue
        }
        const formData = new FormData()
        formData.append("file", item.file)
        const uploadResult = await uploadDamagePhoto(formData)
        if (!uploadResult.success) {
          setError(uploadResult.error ?? "อัปโหลดรูปไม่สำเร็จ")
          return
        }
        uploadedPaths[item.key] = uploadResult.id ?? null
      }

      const result = await createDamageReport({
        branch_id: branchId,
        warehouse_id: warehouseId,
        notes,
        items: items.map((item) => ({
          sku_id: item.sku_id,
          qty: Number(item.qty),
          damage_type: item.damage_type,
          reason: item.reason,
          notes: item.notes,
          photo_url: uploadedPaths[item.key] ?? null,
        })),
      })

      if (result.success && result.id) {
        router.push(`/admin/inventory/damage/${result.id}`)
        router.refresh()
      } else {
        setError(result.error ?? "สร้างรายงานความเสียหายไม่สำเร็จ")
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
          <h2 className="text-sm font-semibold">รายการความเสียหาย</h2>
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
          const qty = Number(item.qty)
          const estimatedValue =
            sku?.latest_cost != null && Number.isFinite(qty)
              ? sku.latest_cost * qty
              : null
          return (
            <div
              key={item.key}
              className="grid gap-3 rounded-lg border border-border p-3 lg:grid-cols-[1fr_130px_180px_1fr_220px_auto]"
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
                    หน่วยฐาน: {unitLabel(sku) || "—"} · ต้นทุนล่าสุด:{" "}
                    {sku.latest_cost == null
                      ? "—"
                      : `${formatMoney(sku.latest_cost)} บาท`}
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
                  value={item.damage_type}
                  className={invInputClass}
                  onChange={(event) =>
                    updateItem(item.key, {
                      damage_type: event.target.value as InvDamageType,
                    })
                  }
                >
                  {Object.entries(DAMAGE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {estimatedValue == null
                    ? thresholdLabel(null)
                    : `${formatMoney(estimatedValue)} บาท · ${thresholdLabel(
                        estimatedValue
                      )}`}
                </p>
              </InventoryFormField>

              <InventoryFormField label="เหตุผล">
                <textarea
                  rows={3}
                  value={item.reason}
                  className={invInputClass}
                  onChange={(event) =>
                    updateItem(item.key, { reason: event.target.value })
                  }
                />
              </InventoryFormField>

              <InventoryFormField label="รูปภาพ">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="block w-full text-sm file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null
                    updateItem(item.key, {
                      file,
                      previewUrl: file ? URL.createObjectURL(file) : null,
                    })
                  }}
                />
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt="Damage preview"
                    className="mt-2 h-24 w-24 rounded-lg border border-border object-cover"
                  />
                ) : null}
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
        {pending ? "กำลังบันทึก…" : "ส่งรายงานความเสียหาย"}
      </Button>
    </div>
  )
}
