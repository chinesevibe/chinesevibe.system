"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, X, Check, ToggleLeft, ToggleRight } from "lucide-react"

import { formatShiftTimeRange, formatShiftDurationHours } from "@/features/shifts/format"
import type { WorkShiftSummary } from "@/features/shifts/types"

type ShiftDraft = {
  code: string
  name: string
  start_hour: string
  start_minute: string
  end_hour: string
  end_minute: string
  crosses_midnight: boolean
  grace_minutes: string
  check_in_early_minutes: string
  standard_hours: string
}

const EMPTY: ShiftDraft = {
  code: "",
  name: "",
  start_hour: "8",
  start_minute: "0",
  end_hour: "17",
  end_minute: "0",
  crosses_midnight: false,
  grace_minutes: "10",
  check_in_early_minutes: "60",
  standard_hours: "8",
}

function shiftToDraft(s: WorkShiftSummary): ShiftDraft {
  return {
    code: s.code,
    name: s.name,
    start_hour: String(s.start_hour),
    start_minute: String(s.start_minute),
    end_hour: String(s.end_hour),
    end_minute: String(s.end_minute),
    crosses_midnight: s.crosses_midnight,
    grace_minutes: String(s.grace_minutes),
    check_in_early_minutes: "60",
    standard_hours: String(s.standard_hours),
  }
}

function draftToBody(d: ShiftDraft) {
  return {
    code: d.code,
    name: d.name,
    start_hour: Number(d.start_hour),
    start_minute: Number(d.start_minute),
    end_hour: Number(d.end_hour),
    end_minute: Number(d.end_minute),
    crosses_midnight: d.crosses_midnight,
    grace_minutes: Number(d.grace_minutes),
    check_in_early_minutes: Number(d.check_in_early_minutes),
    standard_hours: Number(d.standard_hours),
  }
}

function ShiftForm({
  draft,
  onChange,
}: {
  draft: ShiftDraft
  onChange: (d: ShiftDraft) => void
}) {
  const set = (k: keyof ShiftDraft, v: string | boolean) =>
    onChange({ ...draft, [k]: v })

  const inputCls =
    "w-full rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-brand-red"
  const numCls =
    "w-16 rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:border-brand-red"

  return (
    <div className="grid gap-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Code</span>
          <input
            className={inputCls}
            value={draft.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="BRANCH_NIGHT"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">ชื่อกะ</span>
          <input
            className={inputCls}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Branch Night 14:00–02:00"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">เข้างาน (ชม.)</span>
          <input
            type="number"
            min={0}
            max={23}
            className={numCls}
            value={draft.start_hour}
            onChange={(e) => set("start_hour", e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">นาที</span>
          <input
            type="number"
            min={0}
            max={59}
            className={numCls}
            value={draft.start_minute}
            onChange={(e) => set("start_minute", e.target.value)}
          />
        </label>
        <span className="mb-1 text-muted-foreground">–</span>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">ออกงาน (ชม.)</span>
          <input
            type="number"
            min={0}
            max={23}
            className={numCls}
            value={draft.end_hour}
            onChange={(e) => set("end_hour", e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">นาที</span>
          <input
            type="number"
            min={0}
            max={59}
            className={numCls}
            value={draft.end_minute}
            onChange={(e) => set("end_minute", e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.crosses_midnight}
            onChange={(e) => set("crosses_midnight", e.target.checked)}
            className="accent-brand-red"
          />
          ข้ามคืน (crosses midnight)
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Grace (นาที)</span>
          <input
            type="number"
            min={0}
            className={numCls}
            value={draft.grace_minutes}
            onChange={(e) => set("grace_minutes", e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Check-in ก่อนได้ (นาที)</span>
          <input
            type="number"
            min={0}
            className={numCls}
            value={draft.check_in_early_minutes}
            onChange={(e) => set("check_in_early_minutes", e.target.value)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">ชั่วโมงมาตรฐาน</span>
          <input
            type="number"
            min={1}
            className={numCls}
            value={draft.standard_hours}
            onChange={(e) => set("standard_hours", e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

export function ShiftsCrudPanel({ shifts }: { shifts: WorkShiftSummary[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<ShiftDraft>(EMPTY)
  const [err, setErr] = useState<string | null>(null)

  function startEdit(shift: WorkShiftSummary) {
    setEditingId(shift.id)
    setDraft(shiftToDraft(shift))
    setAdding(false)
    setErr(null)
  }

  function startAdd() {
    setAdding(true)
    setEditingId(null)
    setDraft(EMPTY)
    setErr(null)
  }

  function cancel() {
    setEditingId(null)
    setAdding(false)
    setErr(null)
  }

  function save() {
    setErr(null)
    startTransition(async () => {
      try {
        const body = draftToBody(draft)
        const res = editingId
          ? await fetch(`/api/admin/shifts/${editingId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          : await fetch("/api/admin/shifts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
        if (!res.ok) {
          const d = await res.json().catch(() => ({})) as { error?: string }
          setErr(d.error ?? "error")
          return
        }
        cancel()
        router.refresh()
      } catch (e) {
        setErr(e instanceof Error ? e.message : "error")
      }
    })
  }

  function toggleActive(shift: WorkShiftSummary) {
    startTransition(async () => {
      await fetch(`/api/admin/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !shift.is_active }),
      })
      router.refresh()
    })
  }

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">จัดการกะทำงาน (Dev Only)</h3>
          <p className="text-xs text-muted-foreground">เพิ่ม / แก้ไข / เปิด-ปิดการใช้งาน work shift</p>
        </div>
        {!adding && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-red/90"
          >
            <Plus className="size-3.5" />
            เพิ่มกะ
          </button>
        )}
      </div>

      {(adding || editingId) && (
        <div className="mb-4 rounded-lg border border-brand-red/30 bg-brand-red/5 p-4">
          <p className="mb-3 text-xs font-semibold text-brand-red">
            {adding ? "เพิ่มกะใหม่" : `แก้ไข: ${draft.name}`}
          </p>
          <ShiftForm draft={draft} onChange={setDraft} />
          {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              disabled={pending}
              className="flex items-center gap-1 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-red/90 disabled:opacity-60"
            >
              <Check className="size-3.5" />
              {pending ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" />
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {shifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีกะในระบบ</p>
      ) : (
        <ul className="divide-y divide-border/60 text-sm">
          {shifts.map((shift) => (
            <li key={shift.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className={shift.is_active ? "font-medium" : "font-medium text-muted-foreground line-through"}>
                  {shift.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {shift.code} · {formatShiftTimeRange(shift)} · {formatShiftDurationHours(shift)}h
                  {shift.crosses_midnight ? " · ข้ามคืน" : ""}
                  {" · grace "}{shift.grace_minutes}m
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(shift)}
                  disabled={pending}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                  title={shift.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                >
                  {shift.is_active ? (
                    <ToggleRight className="size-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="size-4" />
                  )}
                  {shift.is_active ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => startEdit(shift)}
                  disabled={!!editingId || adding}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
                >
                  <Pencil className="size-3.5" />
                  แก้ไข
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
