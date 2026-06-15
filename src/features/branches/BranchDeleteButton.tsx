"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function BranchDeleteButton({
  branchId,
  branchName,
}: {
  branchId: string
  branchName: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function deleteBranch() {
    if (
      !window.confirm(
        `ลบสาขา "${branchName}"?\n(ลบได้เมื่อไม่มีพนักงานหรือแผนกผูกกับสาขานี้)`
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/branches/${branchId}`, { method: "DELETE" })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(body?.error ?? "ลบสาขาไม่สำเร็จ")
      router.push("/admin/branches")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบสาขาไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={busy}
        onClick={() => void deleteBranch()}
      >
        <Trash2 className="size-4" />
        ลบสาขา
      </Button>
      {error ? <p className="max-w-[14rem] text-right text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
