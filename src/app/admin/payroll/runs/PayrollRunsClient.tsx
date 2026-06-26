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

type ManualLine = {
  id: string
  label: string
  amount: number
  note: string | null
  source: string
}

type YtdData = {
  ytdGross: number
  ytdTax: number
  ytdSso: number
}

type ManualLineModal = {
  payslipId: string
  employeeName: string
} | null

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
  const [searchTerm, setSearchTerm] = useState("")

  // expanded payslip state
  const [expandedPayslipId, setExpandedPayslipId] = useState<string | null>(null)
  const [payslipLines, setPayslipLines] = useState<Record<string, ManualLine[]>>({})
  const [payslipYtd, setPayslipYtd] = useState<Record<string, YtdData>>({})
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({})

  // manual line modal
  const [manualLineModal, setManualLineModal] = useState<ManualLineModal>(null)
  const [modalLabel, setModalLabel] = useState("")
  const [modalAmount, setModalAmount] = useState("")
  const [modalNote, setModalNote] = useState("")
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // net amounts overrides (updated after adding/removing lines)
  const [netOverrides, setNetOverrides] = useState<Record<string, number>>({})

  // PDF language selector (global)
  const [pdfLang, setPdfLang] = useState<"zh" | "en">("zh")

  const period = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`

  const previewRange = useMemo(() => {
    try {
      return resolvePeriodRange({ period, cutoffDay })
    } catch {
      return null
    }
  }, [period, cutoffDay])

  const filtered = useMemo(() => {
    if (!run) return [] as PayslipRow[]
    if (!searchTerm) return run.payslips
    return run.payslips.filter((p) =>
      p.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [run, searchTerm])

  const batches = useMemo(() => {
    return {
      day4: filtered.filter((p) => p.pay_day === 4),
      day5: filtered.filter((p) => p.pay_day === 5),
    }
  }, [filtered])

  // TODO: branch/dept/payment_method breakdown — needs API to include those fields
  const summary = useMemo(() => {
    if (!run) return null
    const all = run.payslips
    const byPayType = (payType: string) => all.filter((p) => p.pay_type === payType)
    const byPayDay = (payDay: number) => all.filter((p) => p.pay_day === payDay)
    const sum = (rows: PayslipRow[]) => ({
      count: rows.length,
      gross: rows.reduce((acc, p) => acc + p.gross_amount, 0),
      net: rows.reduce((acc, p) => acc + (netOverrides[p.id] ?? p.net_amount), 0),
    })
    return {
      hourly: sum(byPayType("hourly")),
      monthly: sum(byPayType("monthly")),
      day4: sum(byPayDay(4)),
      day5: sum(byPayDay(5)),
      total: sum(all),
    }
  }, [run, netOverrides])

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
      setExpandedPayslipId(null)
      setPayslipLines({})
      setPayslipYtd({})
      setNetOverrides({})
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
      setExpandedPayslipId(null)
      setPayslipLines({})
      setPayslipYtd({})
      setNetOverrides({})
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

  async function handleExpandPayslip(payslip: PayslipRow) {
    if (expandedPayslipId === payslip.id) {
      setExpandedPayslipId(null)
      return
    }
    setExpandedPayslipId(payslip.id)

    // Only fetch lines/ytd if run is draft and not already loaded
    if (run?.status === "draft" && !payslipLines[payslip.id]) {
      setLoadingLines((prev) => ({ ...prev, [payslip.id]: true }))
      try {
        const [linesRes, ytdRes] = await Promise.all([
          fetch(`/api/payroll/payslips/${payslip.id}/lines`),
          fetch(`/api/payroll/payslips/${payslip.id}/ytd`),
        ])
        if (linesRes.ok) {
          const linesData = await linesRes.json()
          setPayslipLines((prev) => ({
            ...prev,
            [payslip.id]: (linesData.lines ?? []).filter(
              (l: ManualLine) => l.source === "manual"
            ),
          }))
        }
        if (ytdRes.ok) {
          const ytdData = await ytdRes.json()
          setPayslipYtd((prev) => ({ ...prev, [payslip.id]: ytdData }))
        }
      } finally {
        setLoadingLines((prev) => ({ ...prev, [payslip.id]: false }))
      }
    } else if (!payslipYtd[payslip.id]) {
      // For locked runs, still fetch YTD
      const ytdRes = await fetch(`/api/payroll/payslips/${payslip.id}/ytd`)
      if (ytdRes.ok) {
        const ytdData = await ytdRes.json()
        setPayslipYtd((prev) => ({ ...prev, [payslip.id]: ytdData }))
      }
    }
  }

  function openManualLineModal(payslip: PayslipRow) {
    setManualLineModal({ payslipId: payslip.id, employeeName: payslip.employee_name ?? "—" })
    setModalLabel("")
    setModalAmount("")
    setModalNote("")
    setModalError(null)
  }

  function closeManualLineModal() {
    setManualLineModal(null)
    setModalSubmitting(false)
    setModalError(null)
  }

  async function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualLineModal) return
    const amount = parseFloat(modalAmount)
    if (!modalLabel.trim() || isNaN(amount)) {
      setModalError("กรุณากรอกชื่อรายการและจำนวนเงิน")
      return
    }
    setModalSubmitting(true)
    setModalError(null)
    try {
      const res = await fetch(
        `/api/payroll/payslips/${manualLineModal.payslipId}/lines`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ label: modalLabel.trim(), amount, note: modalNote.trim() || null }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "เพิ่มรายการไม่สำเร็จ")

      // Update net override
      if (typeof data.net_amount === "number") {
        setNetOverrides((prev) => ({ ...prev, [manualLineModal.payslipId]: data.net_amount }))
      }

      // Add line to local state
      if (data.line) {
        setPayslipLines((prev) => ({
          ...prev,
          [manualLineModal.payslipId]: [
            ...(prev[manualLineModal.payslipId] ?? []),
            data.line as ManualLine,
          ],
        }))
      }
      closeManualLineModal()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
    } finally {
      setModalSubmitting(false)
    }
  }

  async function handleDeleteLine(payslipId: string, lineId: string) {
    try {
      const res = await fetch(
        `/api/payroll/payslips/${payslipId}/lines?lineId=${lineId}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "ลบไม่สำเร็จ")

      if (typeof data.net_amount === "number") {
        setNetOverrides((prev) => ({ ...prev, [payslipId]: data.net_amount }))
      }
      setPayslipLines((prev) => ({
        ...prev,
        [payslipId]: (prev[payslipId] ?? []).filter((l) => l.id !== lineId),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบรายการไม่สำเร็จ")
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
                {run?.status === "draft" ? <th className="px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const isExpanded = expandedPayslipId === p.id
                const lines = payslipLines[p.id] ?? []
                const ytd = payslipYtd[p.id]
                const netDisplay = netOverrides[p.id] ?? p.net_amount
                return (
                  <>
                    <tr
                      key={p.id}
                      className="border-b last:border-0 cursor-pointer hover:bg-muted/20"
                      onClick={() => handleExpandPayslip(p)}
                    >
                      <td className="px-3 py-2">
                        <span className="mr-1 text-xs text-muted-foreground">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                        {p.employee_name ?? "—"}
                      </td>
                      <td className="px-3 py-2">{payTypeDisplayLabel(p.pay_type)}</td>
                      <td className="px-3 py-2">{formatPayrollHours(p.regular_hours + p.ot_hours)}</td>
                      <td className="px-3 py-2">{formatMoney(p.gross_amount)}</td>
                      <td className="px-3 py-2">
                        {formatMoney(p.sso_deduction + p.tax_deduction + p.other_deductions)}
                      </td>
                      <td className="px-3 py-2 font-medium">{formatMoney(netDisplay)}</td>
                      <td className="px-3 py-2">{p.payment_date}</td>
                      {run?.status === "draft" ? (
                        <td className="px-3 py-2">
                          <button
                            className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              openManualLineModal(p)
                            }}
                          >
                            + เพิ่มรายการ
                          </button>
                        </td>
                      ) : null}
                    </tr>
                    {isExpanded ? (
                      <tr key={`${p.id}-detail`} className="border-b bg-muted/10">
                        <td colSpan={run?.status === "draft" ? 8 : 7} className="px-4 py-3">
                          {loadingLines[p.id] ? (
                            <p className="text-xs text-muted-foreground">กำลังโหลด…</p>
                          ) : null}

                          {/* Manual lines */}
                          {run?.status === "draft" && lines.length > 0 ? (
                            <div className="mb-2">
                              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                                รายการพิเศษ (manual)
                              </p>
                              <div className="space-y-1">
                                {lines.map((line) => (
                                  <div
                                    key={line.id}
                                    className="flex items-center gap-2 rounded border px-3 py-1 text-xs"
                                  >
                                    <span className="flex-1 font-medium">{line.label}</span>
                                    {line.note ? (
                                      <span className="text-muted-foreground">{line.note}</span>
                                    ) : null}
                                    <span
                                      className={
                                        line.amount >= 0
                                          ? "text-emerald-600"
                                          : "text-destructive"
                                      }
                                    >
                                      {line.amount >= 0 ? "+" : ""}
                                      {formatMoney(line.amount)}
                                    </span>
                                    <button
                                      className="ml-1 text-destructive hover:opacity-70"
                                      onClick={() => handleDeleteLine(p.id, line.id)}
                                      title="ลบรายการ"
                                    >
                                      🗑
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* YTD section */}
                          {ytd ? (
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>
                                รายได้สะสม:{" "}
                                <strong className="text-foreground">
                                  {formatMoney(ytd.ytdGross)}
                                </strong>
                              </span>
                              <span>
                                ภาษีสะสม:{" "}
                                <strong className="text-foreground">
                                  {formatMoney(ytd.ytdTax)}
                                </strong>
                              </span>
                              <span>
                                SSO สะสม:{" "}
                                <strong className="text-foreground">
                                  {formatMoney(ytd.ytdSso)}
                                </strong>
                              </span>
                            </div>
                          ) : null}

                          {/* PDF language selector + Download button */}
                          <div className="mt-3 flex items-center gap-2">
                            <select
                              className="h-8 rounded-lg border px-2 text-xs"
                              value={pdfLang}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation()
                                setPdfLang(e.target.value as "zh" | "en")
                              }}
                            >
                              <option value="zh">中文</option>
                              <option value="en">English</option>
                            </select>
                            <button
                              className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(
                                  `/api/payroll/payslips/${p.id}/pdf?lang=${pdfLang}`,
                                  "_blank"
                                )
                              }}
                            >
                              ⬇ PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </>
                )
              })}
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
      {/* Manual line modal */}
      {manualLineModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold">
              เพิ่มรายการ — {manualLineModal.employeeName}
            </h3>
            <form onSubmit={handleModalSubmit} className="space-y-3">
              <label className="block text-sm">
                <span className="text-muted-foreground">ชื่อรายการ *</span>
                <input
                  type="text"
                  className="mt-1 block h-9 w-full rounded-lg border px-3 text-sm"
                  placeholder="เช่น โบนัส, หักเครื่องแบบ"
                  value={modalLabel}
                  onChange={(e) => setModalLabel(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">จำนวนเงิน * (บวก = รายได้, ลบ = หัก)</span>
                <input
                  type="number"
                  step="0.01"
                  className="mt-1 block h-9 w-full rounded-lg border px-3 text-sm"
                  placeholder="เช่น 1000 หรือ -500"
                  value={modalAmount}
                  onChange={(e) => setModalAmount(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">หมายเหตุ (optional)</span>
                <input
                  type="text"
                  className="mt-1 block h-9 w-full rounded-lg border px-3 text-sm"
                  placeholder="หมายเหตุ"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                />
              </label>
              {modalError ? (
                <p className="text-xs text-destructive">{modalError}</p>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeManualLineModal}
                  disabled={modalSubmitting}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={modalSubmitting}
                  className="bg-brand-red hover:bg-brand-red/90"
                >
                  {modalSubmitting ? "กำลังบันทึก…" : "บันทึก"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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

      {summary ? (
        <div className="mb-4 rounded-xl border p-4">
          <h3 className="mb-3 text-sm font-semibold">สรุปรายจ่าย</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2">ประเภท</th>
                  <th className="px-3 py-2 text-right">จำนวนคน</th>
                  <th className="px-3 py-2 text-right">รวม Gross</th>
                  <th className="px-3 py-2 text-right">รวม Net</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-3 py-2">รายชั่วโมง</td>
                  <td className="px-3 py-2 text-right">{summary.hourly.count}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.hourly.gross)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.hourly.net)}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-3 py-2">รายเดือน</td>
                  <td className="px-3 py-2 text-right">{summary.monthly.count}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.monthly.gross)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.monthly.net)}</td>
                </tr>
                <tr className="border-b bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">วันที่ 4</td>
                  <td className="px-3 py-2 text-right">{summary.day4.count}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.day4.gross)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.day4.net)}</td>
                </tr>
                <tr className="border-b bg-muted/20">
                  <td className="px-3 py-2 text-muted-foreground">วันที่ 5</td>
                  <td className="px-3 py-2 text-right">{summary.day5.count}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.day5.gross)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.day5.net)}</td>
                </tr>
                <tr className="border-t-2 font-semibold">
                  <td className="px-3 py-2">รวมทั้งหมด</td>
                  <td className="px-3 py-2 text-right">{summary.total.count}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.total.gross)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(summary.total.net)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

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

          <div className="mt-4 flex items-center gap-3">
            <input
              type="search"
              placeholder="ค้นหาพนักงาน..."
              className="h-9 w-64 rounded-lg border px-3 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm ? (
              <p className="text-sm text-muted-foreground">
                แสดง {filtered.length} / {run.payslips.length} คน
              </p>
            ) : null}
          </div>

          {renderPayslipTable(`Batch ${payDayLabel(4)}`, batches.day4)}
          {renderPayslipTable(`Batch ${payDayLabel(5)}`, batches.day5)}
        </div>
      ) : null}
    </AdminPageShell>
  )
}
