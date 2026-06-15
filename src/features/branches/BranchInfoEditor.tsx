"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { BranchDetail } from "@/features/branches/branch-hub-data"

export function BranchInfoEditor({ branch }: { branch: BranchDetail }) {
  const router = useRouter()
  const [address, setAddress] = useState(branch.address ?? "")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: address.trim() || null }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string }
      if (!res.ok) throw new Error(data?.error ?? "บันทึกไม่สำเร็จ")
      setMessage("บันทึกที่อยู่แล้ว")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-2 border-t border-border/60 pt-3">
      <label className="block text-xs font-medium text-muted-foreground">
        ที่อยู่สาขา
        <textarea
          rows={2}
          className="mt-1 block w-full max-w-xl rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="เลขที่ ถนน แขวง/ตำบล ฯลฯ"
        />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          บันทึกที่อยู่
        </Button>
        {message ? <span className="text-xs text-green-600">{message}</span> : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </form>
  )
}
