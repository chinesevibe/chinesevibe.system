"use client"

import { useRouter } from "next/navigation"
import { FileImage, Paperclip } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { formatThaiDateTime } from "@/lib/datetime/thailand"
import type { EmployeeProfile } from "@/features/employees/profile/data"

type Note = {
  id: string
  category: string
  note: string
  created_at: string
  attachment_file_name?: string | null
  attachment_uploaded_at?: string | null
  attachment_url?: string | null
}

type RenewalCategory = "visa" | "work_permit" | "contract"

const RENEWAL_OPTIONS: Array<{
  value: RenewalCategory
  label: string
  description: string
}> = [
  { value: "visa", label: "ต่อวีซ่า", description: "อัปเดตวันหมดอายุวีซ่า" },
  { value: "work_permit", label: "ต่อ Work Permit", description: "อัปเดตวันหมดอายุใบอนุญาตทำงาน" },
  { value: "contract", label: "ต่อสัญญา", description: "อัปเดตวันสิ้นสุดสัญญาจ้าง" },
]

const CATEGORY_LABEL: Record<string, string> = {
  probation: "ทดลองงาน",
  visa: "วีซ่า",
  work_permit: "Work Permit",
  contract: "สัญญา",
  blacklist: "Blacklist",
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
  const [renewalCategory, setRenewalCategory] = useState<RenewalCategory>("visa")
  const [renewalDate, setRenewalDate] = useState(
    profile.visa_expiry ?? profile.work_permit_expiry ?? profile.contract_end ?? ""
  )
  const [renewalFile, setRenewalFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function submitRenewal() {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("action", "renewal")
      form.set("note", renewalNote)
      if (renewalCategory === "visa") form.set("visaExpiry", renewalDate)
      if (renewalCategory === "work_permit") form.set("workPermitExpiry", renewalDate)
      if (renewalCategory === "contract") form.set("contractEnd", renewalDate)
      if (renewalFile) form.set("attachment", renewalFile)

      const res = await fetch(`/api/employees/${profile.id}/lifecycle`, {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "บันทึกไม่สำเร็จ")
      }
      setRenewalFile(null)
      setRenewalNote("")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function currentExpiryLabel(category: RenewalCategory): string {
    if (category === "visa") return profile.visa_expiry ?? "—"
    if (category === "work_permit") return profile.work_permit_expiry ?? "—"
    return profile.contract_end ?? "—"
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
        <div className="grid gap-3 text-sm">
          <div className="grid gap-2">
            {RENEWAL_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border px-3 py-2 transition ${
                  renewalCategory === option.value
                    ? "border-brand-red bg-brand-red/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="renewal-category"
                    className="mt-1"
                    checked={renewalCategory === option.value}
                    onChange={() => {
                      setRenewalCategory(option.value)
                      if (option.value === "visa") setRenewalDate(visaExpiry)
                      if (option.value === "work_permit") setRenewalDate(permitExpiry)
                      if (option.value === "contract") setRenewalDate(contractEnd)
                    }}
                  />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            วันหมดอายุ/สิ้นสุดปัจจุบัน: {currentExpiryLabel(renewalCategory)}
          </div>

          <label>
            วันหมดอายุ/สิ้นสุดใหม่
            <input
              type="date"
              className="mt-1 h-9 w-full rounded-lg border px-2"
              value={renewalDate}
              onChange={(e) => {
                const next = e.target.value
                setRenewalDate(next)
                if (renewalCategory === "visa") setVisaExpiry(next)
                if (renewalCategory === "work_permit") setPermitExpiry(next)
                if (renewalCategory === "contract") setContractEnd(next)
              }}
            />
          </label>

          <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">รูปหลักฐานการต่อ</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setRenewalFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-4" />
                แนบรูป
              </Button>
            </div>
            {renewalFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs">
                <FileImage className="size-4 text-brand-red" />
                <span className="truncate">{renewalFile.name}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">รองรับ JPEG, PNG, WEBP ไม่เกิน 5 MB</p>
            )}
          </div>

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
          disabled={busy || !renewalDate}
          onClick={() => void submitRenewal()}
        >
          บันทึกการต่อเอกสาร
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
                <span className="font-medium">{CATEGORY_LABEL[n.category] ?? n.category}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {formatThaiDateTime(n.created_at)}
                </span>
                <p className="mt-1">{n.note}</p>
                {n.attachment_url ? (
                  <a
                    href={n.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-red hover:underline"
                  >
                    <FileImage className="size-3.5" />
                    {n.attachment_file_name ?? "เปิดรูปหลักฐาน"}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
