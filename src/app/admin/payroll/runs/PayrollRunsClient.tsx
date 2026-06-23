"use client"

import { useMemo, useState } from "react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { Button } from "@/components/ui/button"
import { formatPayrollHours } from "@/lib/payroll/format-hours"
import { payDayLabel } from "@/lib/payroll/pay-day"
import { resolvePeriodRange } from "@/lib/payroll/period-range"
import { payTypeDisplayLabel } from "@/lib/payroll/pay-type"
import type { PayrollRunWithPayslips, PayslipRow } from "@/lib/payroll/types"

type Props = {
  defaultCutoffDay: number
  initialPeriod: string
}

function formatMoney(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PayrollRunsClient({ defaultCutoffDay, initialPeriod }: Props) {
  const [year, month] = initialPeriod.split("-").map(Number)
  const [selectedYear, setSelectedYear] = useState(year)
  const [selectedMonth, setSelectedMonth] = useState(month)
  const [cutoffDay, setCutoffDay] = useState(defaultCutoffDay)
  const [run, setRun] = useState<PayrollRunWithPayslips | null>(null)
  const [loading, setLoading] = useState(false)
  const [locking, setLocking] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])

  const period = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`

  const previewRange = useMemo(() => {
    try {
      return resolvePeriodRange({ period, cutoffDay })
    } catch {
      return null
    }
  }, [period, cutoffDay])

  const batches = useMemo(() => {
    if (!run) return { day4: [] as PayslipRow[], day5: [] as PayslipRow[] }
    return {
      day4: run.payslips.filter((p) => p.pay_day === 4),
      day5: run.payslips.filter((p) => p.pay_day === 5),
    }
  }, [run])

  async function handleCreateOrRefresh() {
    setLoading(true)
    setError(null)
    setMessage(null)
    setSkipped([])
    try {
      const res = await fetch("/api/payroll/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ period, cutoffDay }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "คำนวณไม่สำเร็จ")
      setRun(data.run)
      setSkipped(data.skipped ?? [])
      setMessage(`คำนวณแล้ว ${data.run.employee_count} คน · รวม net ${formatMoney(data.run.total_net)} บาท`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadExisting() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/payroll/runs?period=${period}&cutoffDay=${cutoffDay}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "ไม่พบรอบ")
      setRun(data.run)
      if (data.run.cutoff_day) setCutoffDay(data.run.cutoff_day)
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  async function handleLock() {
    if (!run) return
    setLocking(true)
    setError(null)
    try {
      const res = await fetch(`/api/payroll/runs/${run.id}/lock`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Lock ไม่สำเร็จ")
      setRun(data.run)
      setMessage("Lock รอบแล้ว — payslip เป็น final")
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setLocking(false)
    }
  }

  async function handleGeneratePdf() {
    if (!run) return
    setGeneratingPdf(true)
    setError(null)
    try {
      const res = await fetch(`/api/payroll/runs/${run.id}/generate-pdf`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "สร้าง PDF ไม่สำเร็จ")
      setMessage(`สร้าง PDF แล้ว ${data.generated}/${data.total} ใบ`)
      await handleLoadExisting()
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setGeneratingPdf(false)
    }
  }

  function renderPayslipTable(title: string, rows: PayrollRunWithPayslips["payslips"]) {
    if (rows.length === 0) return null
    return (
      <section className="mt-4">
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2">พนักงาน</th>
                <th className="px-3 py-2">ประเภท</th>
                <th className="px-3 py-2">ชม.</th>
                <th className="px-3 py-2">Gross</th>
                <th className="px-3 py-2">หักเพิ่ม</th>
                <th className="px-3 py-2">Net</th>
                <th className="px-3 py-2">วันจ่าย</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{p.employee_name ?? "—"}</td>
                  <td className="px-3 py-2">{payTypeDisplayLabel(p.pay_type)}</td>
                  <td className="px-3 py-2">{formatPayrollHours(p.regular_hours + p.ot_hours)}</td>
                  <td className="px-3 py-2">{formatMoney(p.gross_amount)}</td>
                  <td className="px-3 py-2">
                    {formatMoney(p.sso_deduction + p.tax_deduction + p.other_deductions)}
                  </td>
                  <td className="px-3 py-2 font-medium">{formatMoney(p.net_amount)}</td>
                  <td className="px-3 py-2">{p.payment_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <AdminPageShell
      title="คำนวณเงินเดือน"
      description="กำหนดวันตัดรอบ คำนวณรายได้จริงแบบ gross = net ตอนนี้ แล้ว lock รอบเพื่อสร้าง PDF"
    >
      <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Batch วันจ่าย: {payDayLabel(4)} · {payDayLabel(5)} — จ่ายเดือนถัดจากรอบอ้างอิง
        <br />
        โหมดปัจจุบันยังไม่หักภาษีและประกันสังคม จึงใช้ยอดรายได้สุทธิจาก gross โดยตรง
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl border p-4">
        <label className="block text-sm">
          <span className="text-muted-foreground">เดือนอ้างอิง</span>
          <div className="mt-1 flex gap-2">
            <select
              className="h-9 rounded-lg border px-2 text-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-lg border px-2 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block text-sm">
          <span className="text-muted-foreground">วันตัดรอบ (1–31)</span>
          <input
            type="number"
            min={1}
            max={31}
            className="mt-1 block h-9 w-24 rounded-lg border px-2 text-sm"
            value={cutoffDay}
            onChange={(e) => setCutoffDay(Number(e.target.value))}
          />
        </label>

        {previewRange ? (
          <p className="text-sm text-muted-foreground">
            ช่วงคำนวณ: <strong className="text-foreground">{previewRange.label}</strong>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={loading}
            className="bg-brand-red hover:bg-brand-red/90"
            onClick={handleCreateOrRefresh}
          >
            {loading ? "กำลังคำนวณ…" : "คำนวณ / Refresh"}
          </Button>
          <Button type="button" variant="outline" disabled={loading} onClick={handleLoadExisting}>
            โหลดรอบที่มี
          </Button>
        </div>
      </div>

      {message ? <p className="mb-2 text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}

      {skipped.length > 0 ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>ข้าม ({skipped.length}):</strong>
          <ul className="mt-1 list-inside list-disc">
            {skipped.slice(0, 10).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {run ? (
        <div className="rounded-xl border p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">
                รอบ {run.period} · {run.period_start} – {run.period_end}
              </p>
              <p className="text-sm text-muted-foreground">
                สถานะ: {run.status} · {run.employee_count} คน · Gross{" "}
                {formatMoney(run.total_gross)} · Net {formatMoney(run.total_net)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {run.status === "draft" ? (
                <Button type="button" disabled={locking} onClick={handleLock}>
                  {locking ? "กำลัง lock…" : "Lock รอบ"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={generatingPdf}
                  onClick={handleGeneratePdf}
                >
                  {generatingPdf ? "กำลังสร้าง PDF…" : "สร้าง PDF ทั้งหมด"}
                </Button>
              )}
            </div>
          </div>

          {renderPayslipTable(`Batch ${payDayLabel(4)}`, batches.day4)}
          {renderPayslipTable(`Batch ${payDayLabel(5)}`, batches.day5)}
        </div>
      ) : null}
    </AdminPageShell>
  )
}
