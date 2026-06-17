"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

type DeleteResult = { success: boolean; error?: string }

export function InventoryDeleteButton({
  label,
  onDelete,
}: {
  label: string
  /** Bound server action — do not pass inline closures from Server Components */
  onDelete: () => Promise<DeleteResult>
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!window.confirm(`ยืนยันลบ${label}?\n\nการลบไม่สามารถย้อนกลับได้`)) return
    setBusy(true)
    try {
      const result = await onDelete()
      if (!result.success) {
        window.alert(result.error ?? "ลบไม่สำเร็จ")
        return
      }
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      disabled={busy}
      onClick={() => void handleDelete()}
    >
      ลบ
    </Button>
  )
}
