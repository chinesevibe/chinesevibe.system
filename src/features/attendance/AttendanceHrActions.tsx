"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AttendanceRow } from "@/features/attendance/types"
import { ictDateFromUtc, ictTimeFromUtc } from "@/lib/attendance/ict-datetime"

type EmployeeOptionWithCode = { id: string; name: string; employeeCode: string }

type FormState = {
  employeeSearch: string
  employeeId: string
  date: string
  checkInTime: string
  checkOutTime: string
  checkOutNextDay: boolean
  workHours: string
}

const fieldClass =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

function emptyForm(defaultDate?: string): FormState {
  return {
    employeeSearch: "",
    employeeId: "",
    date: defaultDate ?? "",
    checkInTime: "09:00",
    checkOutTime: "",
    checkOutNextDay: false,
    workHours: "",
  }
}

function formFromRow(row: AttendanceRow): FormState {
  const checkIn = new Date(row.checkInAt)
  const checkOut = row.checkOutAt ? new Date(row.checkOutAt) : null
  return {
    employeeSearch: row.employeeName,
    employeeId: row.employeeId,
    date: ictDateFromUtc(checkIn),
    checkInTime: ictTimeFromUtc(checkIn),
    checkOutTime: checkOut ? ictTimeFromUtc(checkOut) : "",
    checkOutNextDay:
      checkOut != null && ictDateFromUtc(checkOut) !== ictDateFromUtc(checkIn),
    workHours: row.workHours != null ? String(row.workHours) : "",
  }
}

function findEmployeeBySearch(
  employees: EmployeeOptionWithCode[],
  search: string
): EmployeeOptionWithCode | undefined {
  const value = search.trim()
  if (!value) return undefined
  const lowered = value.toLowerCase()
  const byCode = employees.find((employee) => employee.employeeCode.toLowerCase() === lowered)
  if (byCode) return byCode
  const byId = employees.find((employee) => employee.id.toLowerCase() === lowered)
  if (byId) return byId
  const byName = employees.find((employee) => employee.name.toLowerCase() === lowered)
  if (byName) return byName
  return employees.find(
    (employee) =>
      `${employee.name} (${employee.employeeCode})`.toLowerCase() === lowered
  )
}

function AttendanceFormFields({
  form,
  setForm,
  employees,
  mode,
}: {
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  employees: EmployeeOptionWithCode[]
  mode: "create" | "edit"
}) {
  return (
    <div className="grid gap-3">
      {mode === "create" ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">พนักงาน / รหัสพนักงาน</span>
          <input
            list="attendance-employee-options"
            className={fieldClass}
            value={form.employeeSearch}
            onChange={(e) => {
              const value = e.target.value
              const found = findEmployeeBySearch(employees, value)
              setForm((f) => ({
                ...f,
                employeeSearch: value,
                employeeId: found?.id ?? "",
              }))
            }}
            placeholder="พิมพ์ชื่อหรือรหัสพนักงาน"
            required
          />
          <datalist id="attendance-employee-options">
            {employees.map((employee) => (
              <option
                key={employee.id}
                value={employee.employeeCode}
                label={`${employee.name} (${employee.employeeCode})`}
              />
            ))}
          </datalist>
        </label>
      ) : null}

      <label className="grid gap-1 text-sm">
        <span className="font-medium">วันที่ (ICT)</span>
        <input
          type="date"
          className={fieldClass}
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">เวลาเข้า</span>
          <input
            type="time"
            className={fieldClass}
            value={form.checkInTime}
            onChange={(e) => setForm((f) => ({ ...f, checkInTime: e.target.value }))}
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">เวลาออก</span>
          <input
            type="time"
            className={fieldClass}
            value={form.checkOutTime}
            onChange={(e) => setForm((f) => ({ ...f, checkOutTime: e.target.value }))}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.checkOutNextDay}
          onChange={(e) => setForm((f) => ({ ...f, checkOutNextDay: e.target.checked }))}
          className="size-4 rounded border-input"
        />
        เวลาออกเป็นวันถัดไป
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">ชม.การทำงาน (ไม่บังคับ)</span>
        <input
          type="number"
          min={0}
          max={24}
          step={0.01}
          className={fieldClass}
          placeholder="ว่างไว้ = คำนวณจากเวลาเข้า-ออก"
          value={form.workHours}
          onChange={(e) => setForm((f) => ({ ...f, workHours: e.target.value }))}
        />
      </label>
    </div>
  )
}

function useAttendanceSubmit({
  mode,
  rowId,
  onSuccess,
}: {
  mode: "create" | "edit"
  rowId?: string
  onSuccess: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(form: FormState) {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        employeeId: form.employeeId || undefined,
        date: form.date,
        checkInTime: form.checkInTime,
        checkOutTime: form.checkOutTime.trim() || null,
        checkOutNextDay: form.checkOutNextDay,
        workHours: form.workHours.trim() ? Number(form.workHours) : null,
      }

      const url =
        mode === "create"
          ? "/api/admin/attendance"
          : `/api/admin/attendance/${rowId}`
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "บันทึกไม่สำเร็จ")
      }
      onSuccess()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return { submit, busy, error, setError }
}

export function AttendanceAddButton({
  employees,
  defaultDate,
}: {
  employees: EmployeeOptionWithCode[]
  defaultDate?: string
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(() => emptyForm(defaultDate))
  const { submit, busy, error, setError } = useAttendanceSubmit({
    mode: "create",
    onSuccess: () => {
      setOpen(false)
      setForm(emptyForm(defaultDate))
    },
  })

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + บันทึกเข้างาน
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setForm(emptyForm(defaultDate))
            setError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>บันทึกเข้างาน (HR)</DialogTitle>
            <DialogDescription>
              กรอกเวลาเข้า-ออกหรือระบุชม.การทำงานเอง — ใช้เมื่อพนักงานลืมเช็คอิน
            </DialogDescription>
          </DialogHeader>
          <AttendanceFormFields
            form={form}
            setForm={setForm}
            employees={employees}
            mode="create"
          />
          {error ? <p className="text-sm text-brand-red">{error}</p> : null}
          <DialogFooter showCloseButton={false}>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              ยกเลิก
            </Button>
            <Button
              disabled={busy || !form.employeeId || !form.date || !form.checkInTime}
              onClick={() => submit(form)}
            >
              {busy ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AttendanceEditButton({ row }: { row: AttendanceRow }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const initial = useMemo(() => formFromRow(row), [row])
  const [form, setForm] = useState(initial)
  const { submit, busy, error, setError } = useAttendanceSubmit({
    mode: "edit",
    rowId: row.id,
    onSuccess: () => setOpen(false),
  })

  async function remove() {
    if (!confirm(`ลบบันทึกเข้างานของ ${row.employeeName} วันที่ ${row.date}?`)) {
      return
    }
    setError(null)
    const res = await fetch(`/api/admin/attendance/${row.id}`, { method: "DELETE" })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? "ลบไม่สำเร็จ")
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        แก้ไข
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) setForm(formFromRow(row))
          else setError(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขเวลาเข้างาน</DialogTitle>
            <DialogDescription>
              {row.employeeName} · {row.department ?? "—"}
            </DialogDescription>
          </DialogHeader>
          <AttendanceFormFields
            form={form}
            setForm={setForm}
            employees={[]}
            mode="edit"
          />
          {error ? <p className="text-sm text-brand-red">{error}</p> : null}
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" type="button" onClick={remove} disabled={busy}>
              ลบ
            </Button>
            <div className="flex flex-1 justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                ยกเลิก
              </Button>
              <Button
                disabled={busy || !form.date || !form.checkInTime}
                onClick={() => submit(form)}
              >
                {busy ? "กำลังบันทึก…" : "บันทึก"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function AttendanceLocationReviewActions({ row }: { row: AttendanceRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(action: "approve" | "reject") {
    const note =
      action === "reject"
        ? window.prompt("เหตุผลที่ปฏิเสธพิกัด (อย่างน้อย 3 ตัวอักษร)") ?? ""
        : window.prompt("หมายเหตุ (ไม่บังคับ)") ?? ""

    if (action === "reject" && note.trim().length < 3) {
      setError("ต้องระบุเหตุผลการปฏิเสธพิกัด")
      return
    }

    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/admin/attendance/${row.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "บันทึกผลตรวจพิกัดไม่สำเร็จ")
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกผลตรวจพิกัดไม่สำเร็จ")
    } finally {
      setBusy(null)
    }
  }

  if (row.locationReviewStatus !== "pending_hr") {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" disabled={busy !== null} onClick={() => decide("approve")}>
          อนุมัติพิกัด
        </Button>
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => decide("reject")}>
          ปฏิเสธพิกัด
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
