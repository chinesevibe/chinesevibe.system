"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

type ConfigRow = { key: string; value: string; updated_at: string }

export function SettingsPanel({
  rows,
  envWorkHour,
  envWorkMinute,
}: {
  rows: ConfigRow[]
  envWorkHour: string
  envWorkMinute: string
}) {
  const router = useRouter()
  const map = new Map(rows.map((r) => [r.key, r.value]))

  const [workHour, setWorkHour] = useState(map.get("work_start_hour") ?? envWorkHour)
  const [workMinute, setWorkMinute] = useState(map.get("work_start_minute") ?? envWorkMinute)
  const [groupId, setGroupId] = useState(map.get("hr_line_group_id") ?? "")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/settings/runtime", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          work_start_hour: workHour,
          work_start_minute: workMinute,
          hr_line_group_id: groupId,
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "บันทึกไม่สำเร็จ")
      }
      setMessage("บันทึกแล้ว — เวลาเริ่มงานมีผลกับเช็คอินครั้งถัดไป")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-semibold">ตั้งค่าระบบ (runtime)</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">เวลาเริ่มงาน (ชม.)</span>
          <input
            className="h-9 w-full rounded-lg border px-2"
            value={workHour}
            onChange={(e) => setWorkHour(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted-foreground">นาที</span>
          <input
            className="h-9 w-full rounded-lg border px-2"
            value={workMinute}
            onChange={(e) => setWorkMinute(e.target.value)}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-muted-foreground">HR LINE Group ID</span>
          <input
            className="h-9 w-full rounded-lg border px-2 font-mono text-xs"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="Cxxxxxxxx..."
          />
        </label>
      </div>
      {message ? <p className="mt-2 text-sm text-green-600">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      <Button className="mt-3" size="sm" disabled={busy} onClick={save}>
        {busy ? "…" : "บันทึกการตั้งค่า"}
      </Button>
    </section>
  )
}
