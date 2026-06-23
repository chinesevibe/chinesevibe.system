"use client"

import { FormEvent, useState, useTransition } from "react"

import { importInvSkuCsv } from "@/features/inventory/actions/sku"
import { InventoryFormError } from "@/features/inventory/InventoryFormFields"
import type { InventorySkuImportState } from "@/features/inventory/types"

export function InventorySkuImportForm() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<InventorySkuImportState | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setResult(null)
    const form = event.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const nextResult = await importInvSkuCsv(formData)
      setResult(nextResult)
      if (nextResult.success) {
        form.reset()
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border/80 bg-muted/20 p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          disabled={isPending}
          className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-red file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-red/90"
        />
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-red px-4 text-sm font-medium text-white hover:bg-brand-red/90 disabled:opacity-50"
        >
          {isPending ? "กำลัง import..." : "Import CSV"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        ใช้ code เป็น key หลักสำหรับ create/update อัตโนมัติ รองรับหัวตารางเช่น code, name, unit, barcode, min_stock, max_stock
      </p>

      {result?.error ? <div className="mt-3"><InventoryFormError message={result.error} /></div> : null}

      {result?.success ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          import สำเร็จ: create {result.createdCount ?? 0} · update {result.updatedCount ?? 0} · error{" "}
          {result.errorCount ?? 0}
        </div>
      ) : null}

      {result?.rowErrors?.length ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">แถวที่ import ไม่ได้</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {result.rowErrors.map((rowError) => (
              <li key={`${rowError.rowNumber}-${rowError.code ?? "unknown"}`}>
                แถว {rowError.rowNumber}
                {rowError.code ? ` (${rowError.code})` : ""}: {rowError.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  )
}
