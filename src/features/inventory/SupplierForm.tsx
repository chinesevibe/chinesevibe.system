"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState, useTransition } from "react"

import {
  createInvSupplier,
  updateInvSupplier,
} from "@/features/inventory/actions/supplier"
import {
  InventoryFormActions,
  InventoryFormError,
  InventoryFormField,
  InventoryTextInput,
} from "@/features/inventory/InventoryFormFields"
import type { InvSupplier } from "@/features/inventory/types"

export function SupplierForm({
  mode,
  initial,
  readOnly = false,
}: {
  mode: "create" | "edit"
  initial?: InvSupplier
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
          ? await createInvSupplier(formData)
          : await updateInvSupplier(initial!.id, formData)

      if (!result.success) {
        setError(result.error ?? "บันทึกไม่สำเร็จ")
        return
      }

      router.push("/admin/inventory/suppliers")
      router.refresh()
    })
  }

  return (
    <form className="mx-auto grid max-w-2xl gap-4" onSubmit={handleSubmit}>
      {error ? <InventoryFormError message={error} /> : null}

      <InventoryFormField label="รหัส Supplier" htmlFor="code">
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

      <InventoryFormField label="ที่อยู่" htmlFor="address">
        <InventoryTextInput
          id="address"
          name="address"
          defaultValue={initial?.address ?? ""}
          disabled={readOnly}
        />
      </InventoryFormField>

      <InventoryFormField label="ติดต่อ" htmlFor="contact">
        <InventoryTextInput
          id="contact"
          name="contact"
          defaultValue={initial?.contact ?? ""}
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
          <Link
            href="/admin/inventory/suppliers"
            className="text-brand-red hover:underline"
          >
            ← กลับรายการ Supplier
          </Link>
        </p>
      ) : (
        <InventoryFormActions
          cancelHref="/admin/inventory/suppliers"
          submitLabel={mode === "create" ? "สร้าง Supplier" : "บันทึก"}
          pending={isPending}
        />
      )}
    </form>
  )
}
