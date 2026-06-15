"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { LeaveRequestRow } from "@/features/leaves/types"

export function LeaveDecisionActions({ leave }: { leave: LeaveRequestRow }) {
  const router = useRouter()
  const [open, setOpen] = useState<"approve" | "reject" | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (leave.status !== "pending") {
    return (
      <span className="text-xs text-muted-foreground">
        {leave.decisionNote ? leave.decisionNote : "—"}
      </span>
    )
  }

  async function submit(action: "approve" | "reject") {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/leave/${leave.id}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "ดำเนินการไม่สำเร็จ")
      }
      setOpen(null)
      setNote("")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-w-[180px] flex-col gap-2">
      {open === null ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOpen("approve")}>
            อนุมัติ
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpen("reject")}>
            ปฏิเสธ
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            className="min-h-[60px] rounded-lg border border-input px-2 py-1 text-sm"
            placeholder={
              open === "reject"
                ? "เหตุผลที่ไม่อนุมัติ (จำเป็น)"
                : "หมายเหตุ (ไม่บังคับ)"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => submit(open)}
            >
              {busy ? "…" : "ยืนยัน"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setOpen(null)
                setNote("")
                setError(null)
              }}
            >
              ยกเลิก
            </Button>
          </div>
        </div>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
