"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { formatThaiDateTime } from "@/lib/datetime/thailand"
import type { EmployeeProfile } from "@/features/employees/profile/data"

type Note = {
  id: string
  category: string
  note: string
  created_at: string
}

export function LifecyclePanel({
  profile,
  notes,
}: {
  profile: EmployeeProfile
  notes: Note[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [probationOutcome, setProbationOutcome] = useState(profile.probation_outcome ?? "")
  const [probationNote, setProbationNote] = useState(profile.probation_outcome_note ?? "")
  const [extendedUntil, setExtendedUntil] = useState(profile.probation_extended_until ?? "")
  const [visaExpiry, setVisaExpiry] = useState(profile.visa_expiry ?? "")
  const [permitExpiry, setPermitExpiry] = useState(profile.work_permit_expiry ?? "")
  const [contractEnd, setContractEnd] = useState(profile.contract_end ?? "")
  const [renewalNote, setRenewalNote] = useState("")

  async function submit(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/employees/${profile.id}/lifecycle`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "บันทึกไม่สำเร็จ")
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border p-4">
        <h3 className="mb-2 text-sm font-semibold">ผลทดลองงาน</h3>
        <select
          className="mb-2 h-9 w-full rounded-lg border px-2 text-sm"
          value={probationOutcome}
          onChange={(e) => setProbationOutcome(e.target.value)}
        >
          <option value="">— เลือกผล —</option>
          <option value="passed">ผ่าน</option>
          <option value="failed">ไม่ผ่าน</option>
          <option value="extended">ขยายเวลา</option>
        </select>
        {probationOutcome === "extended" ? (
          <input
            type="date"
            className="mb-2 h-9 w-full rounded-lg border px-2 text-sm"
            value={extendedUntil}
            onChange={(e) => setExtendedUntil(e.target.value)}
          />
        ) : null}
        <textarea
          className="mb-2 min-h-[60px] w-full rounded-lg border px-2 py-1 text-sm"
          placeholder="หมายเหตุ"
          value={probationNote}
          onChange={(e) => setProbationNote(e.target.value)}
        />
        <Button
          size="sm"
          disabled={busy || !probationOutcome}
          onClick={() =>
            submit({
              action: "probation",
              outcome: probationOutcome,
              note: probationNote,
              extendedUntil: probationOutcome === "extended" ? extendedUntil : undefined,
            })
          }
        >
          บันทึกผลทดลองงาน
        </Button>
      </section>

      <section className="rounded-xl border p-4">
        <h3 className="mb-2 text-sm font-semibold">ต่อวีซ่า / Work Permit / สัญญา</h3>
        <div className="grid gap-2 text-sm">
          <label>
            วีซ่าหมด
            <input
              type="date"
              className="mt-1 h-9 w-full rounded-lg border px-2"
              value={visaExpiry}
              onChange={(e) => setVisaExpiry(e.target.value)}
            />
          </label>
          <label>
            Work permit หมด
            <input
              type="date"
              className="mt-1 h-9 w-full rounded-lg border px-2"
              value={permitExpiry}
              onChange={(e) => setPermitExpiry(e.target.value)}
            />
          </label>
          <label>
            สัญญาสิ้นสุด
            <input
              type="date"
              className="mt-1 h-9 w-full rounded-lg border px-2"
              value={contractEnd}
              onChange={(e) => setContractEnd(e.target.value)}
            />
          </label>
          <textarea
            className="min-h-[50px] w-full rounded-lg border px-2 py-1"
            placeholder="บันทึกการต่อ / หมายเหตุ"
            value={renewalNote}
            onChange={(e) => setRenewalNote(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          className="mt-2"
          disabled={busy}
          onClick={() =>
            submit({
              action: "renewal",
              visaExpiry: visaExpiry || null,
              workPermitExpiry: permitExpiry || null,
              contractEnd: contractEnd || null,
              note: renewalNote,
            })
          }
        >
          บันทึกวันหมดอายุ
        </Button>
      </section>

      {error ? <p className="text-sm text-destructive lg:col-span-2">{error}</p> : null}

      <section className="rounded-xl border p-4 lg:col-span-2">
        <h3 className="mb-2 text-sm font-semibold">ประวัติ compliance</h3>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีบันทึก</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border px-3 py-2">
                <span className="font-medium">{n.category}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {formatThaiDateTime(n.created_at)}
                </span>
                <p className="mt-1">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
