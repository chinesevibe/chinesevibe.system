"use client"

import { Ban, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { StatusPill } from "@/components/brand/StatusPill"
import { Button } from "@/components/ui/button"
import { formatThaiDateTime } from "@/lib/datetime/thailand"
import type { EmployeeProfile } from "@/features/employees/profile/data"

export function EmployeeDangerZone({ profile }: { profile: EmployeeProfile }) {
  const router = useRouter()
  const [busy, setBusy] = useState<"blacklist" | "clear" | "delete" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  async function postLifecycle(body: Record<string, unknown>) {
    const res = await fetch(`/api/employees/${profile.id}/lifecycle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error ?? "ดำเนินการไม่สำเร็จ")
    }
  }

  async function leaveBlacklist() {
    const note = reason.trim()
    if (note.length < 3) {
      setError("กรุณาระบุเหตุผล Leave Blacklist อย่างน้อย 3 ตัวอักษร")
      return
    }
    if (
      !confirm(
        `ยืนยัน Leave Blacklist สำหรับ ${profile.name}?\n\nพนักงานจะถูกตั้งเป็น Inactive และไม่สามารถลงทะเบียน LINE ซ้ำได้`
      )
    ) {
      return
    }

    setBusy("blacklist")
    setError(null)
    try {
      await postLifecycle({ action: "leave_blacklist", reason: note })
      setReason("")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setBusy(null)
    }
  }

  async function clearBlacklist() {
    if (!confirm(`ยกเลิก Leave Blacklist สำหรับ ${profile.name}?`)) return

    setBusy("clear")
    setError(null)
    try {
      await postLifecycle({ action: "clear_blacklist" })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setBusy(null)
    }
  }

  async function deleteEmployee() {
    if (
      !confirm(
        `ลบรายชื่อ ${profile.name} ถาวร?\n\nข้อมูลการเข้างาน ลา OT และประวัติที่เชื่อมกับพนักงานจะถูกลบด้วย — ไม่สามารถกู้คืนได้`
      )
    ) {
      return
    }

    setBusy("delete")
    setError(null)
    try {
      const res = await fetch(`/api/employees/${profile.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "ลบไม่สำเร็จ")
      }
      router.push("/admin/employees")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="mb-1 text-sm font-semibold text-destructive">การจัดการรายชื่อ</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Leave Blacklist ใช้เมื่อพนักงานลาออก/เลิกจ้างและไม่ควรกลับมาทำงานซ้ำ — ลบรายชื่อถาวรจะลบข้อมูลทั้งหมด
      </p>

      {profile.leave_blacklisted ? (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-background p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusPill label="Leave Blacklist" variant="rejected" />
            {profile.leave_blacklisted_at ? (
              <span className="text-xs text-muted-foreground">
                {formatThaiDateTime(profile.leave_blacklisted_at)}
              </span>
            ) : null}
          </div>
          <p className="text-sm">
            {profile.leave_blacklist_reason ?? "—"}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={busy !== null}
            onClick={clearBlacklist}
          >
            {busy === "clear" ? "กำลังยกเลิก…" : "ยกเลิก Leave Blacklist"}
          </Button>
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-destructive/40 focus-visible:ring-2 focus-visible:ring-destructive/20"
            placeholder="เหตุผล Leave Blacklist (เช่น ลาออกโดยไม่แจ้ง, ทุจริต, ไม่ผ่านเกณฑ์)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={busy !== null}
            onClick={leaveBlacklist}
          >
            <Ban className="size-3.5" />
            {busy === "blacklist" ? "กำลังบันทึก…" : "แจ้ง Leave Blacklist"}
          </Button>
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="destructive"
        disabled={busy !== null}
        onClick={deleteEmployee}
      >
        <Trash2 className="size-3.5" />
        {busy === "delete" ? "กำลังลบ…" : "ลบรายชื่อถาวร"}
      </Button>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
