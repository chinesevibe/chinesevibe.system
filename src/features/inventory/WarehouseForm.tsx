"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState, useTransition } from "react"

import { createInvWarehouse, updateInvWarehouse } from "@/features/inventory/actions/warehouse"
import {
  InventoryFormActions,
  InventoryFormError,
  InventoryFormField,
  InventorySelect,
  InventoryTextInput,
} from "@/features/inventory/InventoryFormFields"
import type { InvBranch, InvWarehouse } from "@/features/inventory/types"

export function WarehouseForm({
  mode,
  initial,
  branches,
  readOnly = false,
}: {
  mode: "create" | "edit"
  initial?: InvWarehouse
  branches: InvBranch[]
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
          ? await createInvWarehouse(formData)
          : await updateInvWarehouse(initial!.id, formData)

      if (!result.success) {
        setError(result.error ?? "บันทึกไม่สำเร็จ")
        return
      }

      router.push("/admin/inventory/warehouses")
      router.refresh()
    })
  }

  return (
    <form className="mx-auto grid max-w-2xl gap-4" onSubmit={handleSubmit}>
      {error ? <InventoryFormError message={error} /> : null}

      <InventoryFormField label="รหัสคลัง" htmlFor="code">
        <InventoryTextInput
          id="code"
          name="code"
          required
          defaultValue={initial?.code}
          disabled={readOnly}
        />
      </InventoryFormField>

      <InventoryFormField label="ชื่อคลัง" htmlFor="name">
        <InventoryTextInput
          id="name"
          name="name"
          required
          defaultValue={initial?.name}
          disabled={readOnly}
        />
      </InventoryFormField>

      <InventoryFormField label="สาขา (คลัง)" htmlFor="branch_id">
        <InventorySelect
          id="branch_id"
          name="branch_id"
          required
          defaultValue={initial?.branch_id ?? ""}
          disabled={readOnly}
        >
          <option value="" disabled>
            เลือกสาขา
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.code} — {branch.name}
            </option>
          ))}
        </InventorySelect>
      </InventoryFormField>

      <InventoryFormField label="ประเภท" htmlFor="type">
        <InventorySelect
          id="type"
          name="type"
          required
          defaultValue={initial?.type ?? "sub"}
          disabled={readOnly}
        >
          <option value="main">Main</option>
          <option value="sub">Sub</option>
        </InventorySelect>
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
            href="/admin/inventory/warehouses"
            className="text-brand-red hover:underline"
          >
            ← กลับรายการคลัง
          </Link>
        </p>
      ) : (
        <InventoryFormActions
          cancelHref="/admin/inventory/warehouses"
          submitLabel={mode === "create" ? "สร้างคลัง" : "บันทึก"}
          pending={isPending}
        />
      )}
    </form>
  )
}
