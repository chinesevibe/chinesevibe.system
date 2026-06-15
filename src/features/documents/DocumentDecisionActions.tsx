"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DOC_ACTIONABLE_STATUSES,
  DOC_STATUS_LABELS,
  resolveDocumentDecisionStatus,
  type DocDecisionAction,
} from "@/features/documents/types"
import type { DocumentRequestRow } from "@/features/documents/data"

export function DocumentDecisionActions({ doc }: { doc: DocumentRequestRow }) {
  const router = useRouter()
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actionable = DOC_ACTIONABLE_STATUSES.includes(doc.status)

  if (!actionable) {
    return (
      <span className="text-xs text-muted-foreground">
        {doc.hrNote ?? DOC_STATUS_LABELS[doc.status]}
      </span>
    )
  }

  async function decide(action: DocDecisionAction) {
    if (action === "reject" && note.trim().length < 3) {
      setError("กรุณาระบุเหตุผลการปฏิเสธอย่างน้อย 3 ตัวอักษร")
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${doc.id}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "ดำเนินการไม่สำเร็จ")
      }
      setNote("")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  async function uploadResult(file: File) {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch(`/api/documents/${doc.id}/upload`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "อัปโหลดไม่สำเร็จ")
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  const approveHint = (() => {
    const next = resolveDocumentDecisionStatus(doc.status, "approve")
    return next !== doc.status ? `→ ${DOC_STATUS_LABELS[next]}` : null
  })()

  return (
    <div className="flex min-w-[200px] flex-col gap-2">
      {doc.status === "processing" || doc.status === "ready" ? (
        <label className="cursor-pointer text-xs text-brand-red underline">
          อัปโหลดไฟล์ผลลัพธ์ (PDF/JPG)
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void uploadResult(f)
            }}
          />
        </label>
      ) : null}
      <textarea
        className="min-h-[50px] rounded-lg border border-input px-2 py-1 text-xs"
        placeholder="หมายเหตุ (จำเป็นเมื่อ Reject)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={busy || doc.status === "on_hold"}
          onClick={() => decide("hold")}
          title="พักคำขอชั่วคราว"
        >
          Hold
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() => decide("approve")}
          title={approveHint ?? undefined}
        >
          {busy ? "…" : "Approve"}
          {approveHint ? (
            <span className="ml-1 text-[10px] font-normal opacity-80">
              {approveHint}
            </span>
          ) : null}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className="border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={() => decide("reject")}
        >
          Reject
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
