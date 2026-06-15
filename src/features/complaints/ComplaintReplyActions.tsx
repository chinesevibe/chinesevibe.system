"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { ComplaintRow } from "@/features/complaints/data"

export function ComplaintReplyActions({ complaint }: { complaint: ComplaintRow }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function lineNotifyLabel(result: {
    lineNotified?: boolean
    lineNotifyReason?: string | null
  }) {
    if (complaint.isAnonymous) {
      return "บันทึกคำตอบแล้ว (นิรนาม — ไม่แจ้ง LINE)"
    }
    if (result.lineNotified) {
      return "บันทึกคำตอบแล้ว · แจ้ง LINE พนักงานแล้ว"
    }
    if (result.lineNotifyReason === "no_line_user") {
      return "บันทึกคำตอบแล้ว · พนักงานไม่มี LINE ในระบบ"
    }
    if (result.lineNotifyReason === "line_error") {
      return "บันทึกคำตอบแล้ว · ส่ง LINE ไม่สำเร็จ (ลองใหม่หรือติดต่อพนักงานโดยตรง)"
    }
    return "บันทึกคำตอบแล้ว"
  }

  if (complaint.status === "closed") {
    return (
      <p className="text-xs text-muted-foreground">
        ปิดเรื่องแล้ว — ไม่สามารถตอบเพิ่มได้
      </p>
    )
  }

  async function submit(close: boolean) {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, close }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        if (body?.error === "case_closed") {
          throw new Error("เรื่องนี้ปิดแล้ว — ไม่สามารถตอบเพิ่มได้")
        }
        throw new Error(body?.error ?? "ส่งคำตอบไม่สำเร็จ")
      }
      const data = (await res.json()) as {
        lineNotified?: boolean
        lineNotifyReason?: string | null
      }
      setMessage("")
      setSuccess(lineNotifyLabel(data))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ส่งคำตอบไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-w-[180px] flex-col gap-2">
      <textarea
        className="min-h-[60px] rounded-lg border border-input px-2 py-1 text-xs"
        placeholder="ข้อความตอบกลับ"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => submit(false)}>
          ตอบกลับ
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => submit(true)}>
          ปิดเรื่อง
        </Button>
      </div>
      {complaint.isAnonymous ? (
        <p className="text-xs text-muted-foreground">ไม่แจ้ง LINE (นิรนาม)</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          ตอบกลับได้หลายครั้งจนกว่าจะกด &quot;ปิดเรื่อง&quot;
        </p>
      )}
      {success ? <p className="text-xs text-green-600">{success}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
