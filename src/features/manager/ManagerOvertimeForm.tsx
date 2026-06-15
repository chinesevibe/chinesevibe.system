"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

export function ManagerOvertimeForm({
  employees,
}: {
  employees: Array<{ id: string; name: string; department: string | null }>
}) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "")
  const [workDate, setWorkDate] = useState("")
  const [startTime, setStartTime] = useState("18:00")
  const [endTime, setEndTime] = useState("20:00")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/overtime/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ employeeId, workDate, startTime, endTime, reason }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string; id?: string }
      if (!res.ok) throw new Error(data?.error ?? "ยื่นไม่สำเร็จ")
      setMessage("ยื่น OT ส่ง HR อนุมัติแล้ว")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยื่นไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-3 rounded-xl border p-4">
      <label className="block text-sm">
        พนักงาน
        <select
          className="mt-1 h-9 w-full rounded-lg border px-2"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        >
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} {emp.department ? `(${emp.department})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        วันที่ทำ OT
        <input
          type="date"
          required
          className="mt-1 h-9 w-full rounded-lg border px-2"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          เริ่ม
          <input
            type="time"
            required
            className="mt-1 h-9 w-full rounded-lg border px-2"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          สิ้นสุด
          <input
            type="time"
            required
            className="mt-1 h-9 w-full rounded-lg border px-2"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </label>
      </div>
      <label className="block text-sm">
        เหตุผล
        <textarea
          required
          minLength={5}
          className="mt-1 min-h-[80px] w-full rounded-lg border px-2 py-1"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <Button type="submit" disabled={busy || !employeeId}>
        ยื่น OT ให้ HR อนุมัติ
      </Button>
      {message ? <p className="text-sm text-green-600">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
