"use client"

import { useEffect, useState } from "react"
import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { Button } from "@/components/ui/button"

type AdvanceStatus = "pending" | "deducted" | "cancelled"

type Advance = {
  id: string
  employee_id: string
  amount: number
  advance_date: string
  deduct_period: string
  note: string | null
  status: AdvanceStatus
  created_at: string
  hr_employees: {
    name: string
    employee_code: string | null
  }
}

type Employee = {
  id: string
  name: string
  employee_code: string | null
}

function formatMoney(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function StatusBadge({ status }: { status: AdvanceStatus }) {
  const map: Record<AdvanceStatus, { label: string; className: string }> = {
    pending: { label: "รอดำเนินการ", className: "bg-yellow-100 text-yellow-800" },
    deducted: { label: "หักแล้ว", className: "bg-emerald-100 text-emerald-800" },
    cancelled: { label: "ยกเลิก", className: "bg-red-100 text-red-700" },
  }
  const { label, className } = map[status] ?? { label: status, className: "bg-muted text-foreground" }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

export default function AdvancesPage() {
  const [advances, setAdvances] = useState<Advance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Employee search for form
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empSearch, setEmpSearch] = useState("")
  const [empSearchResults, setEmpSearchResults] = useState<Employee[]>([])
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null)
  const [showEmpDropdown, setShowEmpDropdown] = useState(false)

  // Form state
  const [formAmount, setFormAmount] = useState("")
  const [formDeductPeriod, setFormDeductPeriod] = useState("")
  const [formNote, setFormNote] = useState("")
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Cancelling state
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function loadAdvances() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/payroll/advances")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "โหลดข้อมูลไม่สำเร็จ")
      setAdvances(data.advances ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdvances()
  }, [])

  // Employee search
  useEffect(() => {
    if (!empSearch.trim()) {
      setEmpSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/employees?search=${encodeURIComponent(empSearch)}&status=active`
        )
        if (res.ok) {
          const data = await res.json()
          setEmpSearchResults(
            (data.employees ?? []).slice(0, 10).map((e: { id: string; name: string; employee_code: string | null }) => ({
              id: e.id,
              name: e.name,
              employee_code: e.employee_code,
            }))
          )
        }
      } catch {
        // ignore
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [empSearch])

  // Default deduct_period to current month
  useEffect(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    setFormDeductPeriod(`${y}-${m}`)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEmp) {
      setFormError("กรุณาเลือกพนักงาน")
      return
    }
    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) {
      setFormError("กรุณากรอกจำนวนเงินที่ถูกต้อง")
      return
    }
    if (!formDeductPeriod) {
      setFormError("กรุณาระบุเดือนที่หัก")
      return
    }
    setFormSubmitting(true)
    setFormError(null)
    setMessage(null)
    try {
      const res = await fetch("/api/payroll/advances", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employee_id: selectedEmp.id,
          amount,
          deduct_period: formDeductPeriod,
          note: formNote.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ")
      setMessage(`เพิ่มเงินล่วงหน้าสำหรับ ${selectedEmp.name} แล้ว`)
      // Reset form
      setSelectedEmp(null)
      setEmpSearch("")
      setFormAmount("")
      setFormNote("")
      // Reload list
      await loadAdvances()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleCancel(id: string) {
    setCancellingId(id)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/payroll/advances/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "ยกเลิกไม่สำเร็จ")
      setAdvances((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" as AdvanceStatus } : a))
      )
      setMessage("ยกเลิกรายการเรียบร้อยแล้ว")
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setCancellingId(null)
    }
  }

  const _ = employees // suppress unused warning
  void _

  return (
    <AdminPageShell
      title="เงินล่วงหน้า"
      description="บันทึกเงินล่วงหน้าพนักงาน ระบบจะหักอัตโนมัติในรอบเงินเดือนที่กำหนด"
    >
      {/* Add form */}
      <div className="mb-6 rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-semibold">เพิ่มเงินล่วงหน้า</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          {/* Employee picker */}
          <div className="relative min-w-[220px]">
            <label className="block text-xs text-muted-foreground">พนักงาน *</label>
            <input
              type="text"
              className="mt-1 h-9 w-full rounded-lg border px-3 text-sm"
              placeholder="ค้นหาชื่อพนักงาน..."
              value={selectedEmp ? `${selectedEmp.name}${selectedEmp.employee_code ? ` (${selectedEmp.employee_code})` : ""}` : empSearch}
              onChange={(e) => {
                setSelectedEmp(null)
                setEmpSearch(e.target.value)
                setShowEmpDropdown(true)
              }}
              onFocus={() => setShowEmpDropdown(true)}
              onBlur={() => setTimeout(() => setShowEmpDropdown(false), 150)}
            />
            {showEmpDropdown && empSearchResults.length > 0 ? (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-background shadow-lg text-sm">
                {empSearchResults.map((emp) => (
                  <li
                    key={emp.id}
                    className="cursor-pointer px-3 py-2 hover:bg-muted"
                    onMouseDown={() => {
                      setSelectedEmp(emp)
                      setEmpSearch("")
                      setShowEmpDropdown(false)
                    }}
                  >
                    {emp.name}
                    {emp.employee_code ? (
                      <span className="ml-1 text-muted-foreground">({emp.employee_code})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Amount */}
          <label className="block text-xs">
            <span className="text-muted-foreground">จำนวนเงิน (บาท) *</span>
            <input
              type="number"
              min="1"
              step="0.01"
              className="mt-1 block h-9 w-32 rounded-lg border px-3 text-sm"
              placeholder="0.00"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              required
            />
          </label>

          {/* Deduct period */}
          <label className="block text-xs">
            <span className="text-muted-foreground">หักในเดือน *</span>
            <input
              type="month"
              className="mt-1 block h-9 rounded-lg border px-3 text-sm"
              value={formDeductPeriod}
              onChange={(e) => setFormDeductPeriod(e.target.value)}
              required
            />
          </label>

          {/* Note */}
          <label className="block text-xs">
            <span className="text-muted-foreground">หมายเหตุ</span>
            <input
              type="text"
              className="mt-1 block h-9 w-48 rounded-lg border px-3 text-sm"
              placeholder="หมายเหตุ (optional)"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
            />
          </label>

          <Button
            type="submit"
            disabled={formSubmitting}
            className="bg-brand-red hover:bg-brand-red/90"
          >
            {formSubmitting ? "กำลังบันทึก…" : "เพิ่มรายการ"}
          </Button>
        </form>
        {formError ? <p className="mt-2 text-xs text-destructive">{formError}</p> : null}
      </div>

      {message ? <p className="mb-2 text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}

      {/* Advances table */}
      <div className="rounded-xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2">พนักงาน</th>
                <th className="px-3 py-2">รหัส</th>
                <th className="px-3 py-2 text-right">จำนวนเงิน</th>
                <th className="px-3 py-2">วันที่รับ</th>
                <th className="px-3 py-2">หักเดือน</th>
                <th className="px-3 py-2">หมายเหตุ</th>
                <th className="px-3 py-2">สถานะ</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">
                    กำลังโหลด…
                  </td>
                </tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">
                    ยังไม่มีรายการ
                  </td>
                </tr>
              ) : (
                advances.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{a.hr_employees.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.hr_employees.employee_code ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(a.amount)}</td>
                    <td className="px-3 py-2">{a.advance_date}</td>
                    <td className="px-3 py-2">{a.deduct_period}</td>
                    <td className="px-3 py-2 text-muted-foreground">{a.note ?? "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-3 py-2">
                      {a.status === "pending" ? (
                        <button
                          className="rounded border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          disabled={cancellingId === a.id}
                          onClick={() => handleCancel(a.id)}
                        >
                          {cancellingId === a.id ? "กำลังยกเลิก…" : "ยกเลิก"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageShell>
  )
}
