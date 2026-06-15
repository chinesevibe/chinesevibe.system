"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState, useTransition } from "react"

import { createInvSku, updateInvSku } from "@/features/inventory/actions/sku"
import {
  InventoryFormActions,
  InventoryFormError,
  InventoryFormField,
  InventorySelect,
  InventoryTextInput,
} from "@/features/inventory/InventoryFormFields"
import type { InvSku, InvUnit } from "@/features/inventory/types"

export function SkuForm({
  mode,
  initial,
  units,
  readOnly = false,
}: {
  mode: "create" | "edit"
  initial?: InvSku
  units: InvUnit[]
  readOnly?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (readOnly) return
    setError(null)

    const formData = new FormData(event.currentTarget)
    formData.set("is_active", isActive ? "true" : "false")

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createInvSku(formData)
          : await updateInvSku(initial!.id, formData)

      if (!result.success) {
        setError(result.error ?? "บันทึกไม่สำเร็จ")
        return
      }

      router.push("/admin/inventory/sku")
      router.refresh()
    })
  }

  return (
    <form className="mx-auto grid max-w-2xl gap-4" onSubmit={handleSubmit}>
      {error ? <InventoryFormError message={error} /> : null}

      <InventoryFormField label="รหัส SKU" htmlFor="code">
        <InventoryTextInput
          id="code"
          name="code"
          required
          defaultValue={initial?.code}
          disabled={readOnly}
        />
      </InventoryFormField>

      <InventoryFormField label="ชื่อ" htmlFor="name">
        <InventoryTextInput
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          disabled={readOnly}
        />
      </InventoryFormField>

      <InventoryFormField label="หมวดหมู่" htmlFor="category">
        <InventoryTextInput
          id="category"
          name="category"
          defaultValue={initial?.category ?? ""}
          disabled={readOnly}
        />
      </InventoryFormField>

      <InventoryFormField label="หน่วย" htmlFor="unit_id">
        <InventorySelect
          id="unit_id"
          name="unit_id"
          defaultValue={initial?.unit_id ?? ""}
          disabled={readOnly}
        >
          <option value="">— ไม่ระบุ —</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
              {unit.abbreviation ? ` (${unit.abbreviation})` : ""}
            </option>
          ))}
        </InventorySelect>
      </InventoryFormField>

      <InventoryFormField label="Barcode" htmlFor="barcode">
        <InventoryTextInput
          id="barcode"
          name="barcode"
          defaultValue={initial?.barcode ?? ""}
          disabled={readOnly}
        />
      </InventoryFormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <InventoryFormField label="สต็อกขั้นต่ำ" htmlFor="min_stock">
          <InventoryTextInput
            id="min_stock"
            name="min_stock"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={initial?.min_stock ?? 0}
            disabled={readOnly}
          />
        </InventoryFormField>
        <InventoryFormField label="สต็อกสูงสุด" htmlFor="max_stock">
          <InventoryTextInput
            id="max_stock"
            name="max_stock"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={initial?.max_stock ?? 0}
            disabled={readOnly}
          />
        </InventoryFormField>
      </div>

      <InventoryFormField label="URL รูปภาพ" htmlFor="image_url">
        <InventoryTextInput
          id="image_url"
          name="image_url"
          type="url"
          defaultValue={initial?.image_url ?? ""}
          disabled={readOnly}
        />
      </InventoryFormField>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={readOnly}
          className="size-4 rounded border-input"
        />
        ใช้งาน
      </label>

      {readOnly ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/inventory/sku" className="text-brand-red hover:underline">
            ← กลับรายการ SKU
          </Link>
        </p>
      ) : (
        <InventoryFormActions
          cancelHref="/admin/inventory/sku"
          submitLabel={mode === "create" ? "สร้าง SKU" : "บันทึก"}
          pending={isPending}
        />
      )}
    </form>
  )
}
