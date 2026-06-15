"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState, useTransition } from "react"

import { createInvBranch, updateInvBranch } from "@/features/inventory/actions/branch"
import {
  InventoryFormActions,
  InventoryFormError,
  InventoryFormField,
  InventoryTextInput,
} from "@/features/inventory/InventoryFormFields"
import type { InvBranch } from "@/features/inventory/types"

export function BranchForm({
  mode,
  initial,
  readOnly = false,
}: {
  mode: "create" | "edit"
  initial?: InvBranch
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
          ? await createInvBranch(formData)
          : await updateInvBranch(initial!.id, formData)

      if (!result.success) {
        setError(result.error ?? "บันทึกไม่สำเร็จ")
        return
      }

      router.push("/admin/inventory/branches")
      router.refresh()
    })
  }

  return (
    <form className="mx-auto grid max-w-2xl gap-4" onSubmit={handleSubmit}>
      {error ? <InventoryFormError message={error} /> : null}

      <InventoryFormField label="รหัสสาขา" htmlFor="code">
        <InventoryTextInput
          id="code"
          name="code"
          required
          defaultValue={initial?.code}
          disabled={readOnly}
        />
      </InventoryFormField>

      <InventoryFormField label="ชื่อสาขา" htmlFor="name">
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
            href="/admin/inventory/branches"
            className="text-brand-red hover:underline"
          >
            ← กลับรายการสาขา
          </Link>
        </p>
      ) : (
        <InventoryFormActions
          cancelHref="/admin/inventory/branches"
          submitLabel={mode === "create" ? "สร้างสาขา" : "บันทึก"}
          pending={isPending}
        />
      )}
    </form>
  )
}
