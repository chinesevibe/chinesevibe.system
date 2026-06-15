"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { WidgetCard } from "@/components/brand/WidgetCard"
import { Button } from "@/components/ui/button"

export function PendingRegistrationApproval({
  employeeId,
}: {
  employeeId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        const err = body?.error ?? "อนุมัติไม่สำเร็จ"
        throw new Error(
          err === "forbidden"
            ? "ไม่มีสิทธิ์อนุมัติ — ต้อง login เป็น HR หรือ Admin"
            : err
        )
      }
      setMessage("อนุมัติการลงทะเบียนแล้ว — พนักงานใช้เมนู HR ใน LINE ได้")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "อนุมัติไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <WidgetCard title="รออนุมัติการลงทะเบียน">
      <p className="text-sm text-muted-foreground">
        พนักงานส่งคำขอผ่านฟอร์มลงทะเบียนแล้ว — ตรวจสอบชื่อ เบอร์ และสาขา
        ก่อนกดอนุมัติ (ไม่มี Web Dashboard สำหรับพนักงาน)
      </p>
      <Button
        type="button"
        className="mt-4 bg-brand-red text-white hover:bg-brand-red/90"
        disabled={busy}
        onClick={() => void approve()}
      >
        {busy ? "กำลังอนุมัติ…" : "อนุมัติเข้าใช้งาน"}
      </Button>
      {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </WidgetCard>
  )
}
