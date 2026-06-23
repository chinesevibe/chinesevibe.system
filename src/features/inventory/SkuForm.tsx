"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChangeEvent, FormEvent, useEffect, useState, useTransition } from "react"

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
  const [imagePreview, setImagePreview] = useState(initial?.image_url ?? "")

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError(null)

    setImagePreview((current) => {
      if (current.startsWith("blob:")) {
        URL.revokeObjectURL(current)
      }
      return file ? URL.createObjectURL(file) : initial?.image_url ?? ""
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

      <InventoryFormField label="รูปภาพสินค้า" htmlFor="image_file">
        <input type="hidden" name="image_url" defaultValue={initial?.image_url ?? ""} />
        <input
          id="image_file"
          name="image_file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={readOnly}
          onChange={handleImageChange}
          className="block h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p className="text-xs text-muted-foreground">
          แนบ JPG, PNG หรือ WEBP ขนาดไม่เกิน 5MB
        </p>
        {imagePreview ? (
          <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt={initial?.name ?? "SKU image preview"}
              className="h-48 w-full object-contain bg-white"
            />
          </div>
        ) : null}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <InventoryFormField label="วิธีจ่ายเริ่มต้น" htmlFor="default_issue_method">
          <InventorySelect
            id="default_issue_method"
            name="default_issue_method"
            defaultValue={initial?.default_issue_method ?? "fefo"}
            disabled={readOnly}
          >
            <option value="fefo">FEFO (หมดอายุก่อน)</option>
            <option value="fifo">FIFO (รับก่อน)</option>
            <option value="manual">Manual (เลือก Lot เอง)</option>
          </InventorySelect>
        </InventoryFormField>
        <InventoryFormField label="ประเภทจัดเก็บ" htmlFor="storage_type">
          <InventorySelect
            id="storage_type"
            name="storage_type"
            defaultValue={initial?.storage_type ?? ""}
            disabled={readOnly}
          >
            <option value="">— ไม่ระบุ —</option>
            <option value="dry">แห้ง</option>
            <option value="chilled">เย็น</option>
            <option value="frozen">แช่แข็ง</option>
          </InventorySelect>
        </InventoryFormField>
      </div>

      <InventoryFormField label="อายุเก็บ (วัน)" htmlFor="shelf_life_days">
        <InventoryTextInput
          id="shelf_life_days"
          name="shelf_life_days"
          type="number"
          min={1}
          step={1}
          defaultValue={initial?.shelf_life_days ?? ""}
          disabled={readOnly}
        />
      </InventoryFormField>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="expiry_required"
          value="true"
          defaultChecked={initial?.expiry_required ?? false}
          disabled={readOnly}
          className="size-4 rounded border-input"
        />
        บังคับระบุวันหมดอายุเมื่อรับเข้า
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="lot_tracking_required"
          value="true"
          defaultChecked={initial?.lot_tracking_required ?? true}
          disabled={readOnly}
          className="size-4 rounded border-input"
        />
        ติดตาม Lot
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
