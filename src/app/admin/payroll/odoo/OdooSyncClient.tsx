'use client'

import { useState } from 'react'

interface SyncResult {
  employee_id: string
  employee_name: string
  payslip_id: number
  pay_day: 4 | 5
  payment_date: string
  success: boolean
  error?: string
}

interface PayslipBatch {
  pay_day: 4 | 5
  payment_date: string
  batch_id: number | null
  payslip_ids: number[]
}

interface SyncResponse {
  success: boolean
  summary: {
    period: string
    total_employees: number
    processed: number
    successful: number
    failed: number
  }
  batches?: PayslipBatch[]
  results: SyncResult[]
  errors?: string[]
}

interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error' | 'checking'
  message: string
  uid?: number
}

export function OdooSyncClient() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [syncing, setSyncing] = useState(false)
  const [syncingEmployees, setSyncingEmployees] = useState(false)
  const [employeeSyncMessage, setEmployeeSyncMessage] = useState<string | null>(null)
  const [checkingConnection, setCheckingConnection] = useState(false)
  const [result, setResult] = useState<SyncResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'checking',
    message: 'กำลังตรวจสอบ...',
  })

  const checkConnection = async () => {
    setCheckingConnection(true)
    setError(null)
    try {
      const res = await fetch('/api/odoo/sync-payroll')
      const data: ConnectionStatus = await res.json()
      setConnectionStatus(data)
    } catch (err) {
      setConnectionStatus({
        status: 'error',
        message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาด',
      })
    } finally {
      setCheckingConnection(false)
    }
  }

  const handleSyncEmployees = async () => {
    setSyncingEmployees(true)
    setError(null)
    setEmployeeSyncMessage(null)
    try {
      const res = await fetch('/api/odoo/sync-employees', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync employees failed')
      setEmployeeSyncMessage(
        `Sync พนักงานสำเร็จ ${data.summary.successful}/${data.summary.total} คน` +
          (data.summary.failed > 0 ? ` (ล้มเหลว ${data.summary.failed})` : '')
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync employees failed')
    } finally {
      setSyncingEmployees(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setError(null)
    setResult(null)

    const period = `${year}-${String(month).padStart(2, '0')}`

    try {
      const res = await fetch('/api/odoo/sync-payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || 'เกิดข้อผิดพลาด')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="mb-1 text-sm font-semibold">สถานะการเชื่อมต่อ Odoo</h3>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  connectionStatus.status === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus.status === 'checking'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {connectionStatus.message}
              </span>
              {connectionStatus.uid && (
                <span className="text-xs text-muted-foreground">(UID: {connectionStatus.uid})</span>
              )}
            </div>
          </div>
          <button
            onClick={checkConnection}
            disabled={checkingConnection}
            className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {checkingConnection ? 'กำลังตรวจสอบ...' : 'ตรวจสอบการเชื่อมต่อ'}
          </button>
        </div>
      </div>

      {/* Employee sync */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-2 text-sm font-semibold">Sync รายชื่อพนักงาน</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          ส่งชื่อ รหัส อีเมล เงินเดือน และ pay structure จาก HR App ไป Odoo (ไม่ต้องรอรอบ payroll)
        </p>
        <button
          onClick={handleSyncEmployees}
          disabled={syncingEmployees || connectionStatus.status !== 'connected'}
          className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {syncingEmployees ? 'กำลัง Sync พนักงาน…' : 'Sync รายชื่อพนักงาน → Odoo'}
        </button>
        {employeeSyncMessage ? (
          <p className="mt-3 text-sm text-green-700">{employeeSyncMessage}</p>
        ) : null}
      </div>

      {/* Sync Form */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">Sync Payroll ไปยัง Odoo</h3>

        <p className="mb-4 text-xs text-muted-foreground">
          เงินเดือนเดือนที่เลือกจะจ่ายอัตโนมัติแยก batch: ไทย/พม่า วันที่ 4 · จีน วันที่ 5
          (เดือนถัดไป)
        </p>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">เดือน</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              disabled={syncing}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleDateString('th-TH', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">ปี</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              disabled={syncing}
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || connectionStatus.status !== 'connected'}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {syncing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              กำลัง Sync...
            </span>
          ) : (
            'Sync Payroll ไปยัง Odoo'
          )}
        </button>

        {connectionStatus.status !== 'connected' && (
          <p className="mt-2 text-xs text-muted-foreground">
            ⚠️ ต้องเชื่อมต่อ Odoo ก่อนจึงจะ sync ได้
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h4 className="mb-1 text-sm font-semibold text-red-900">เกิดข้อผิดพลาด</h4>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold">สรุปผลการ Sync</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{result.summary.total_employees}</div>
                <div className="text-xs text-muted-foreground">พนักงานทั้งหมด</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{result.summary.processed}</div>
                <div className="text-xs text-muted-foreground">ประมวลผล</div>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="text-2xl font-bold text-green-700">
                  {result.summary.successful}
                </div>
                <div className="text-xs text-green-600">สำเร็จ</div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="text-2xl font-bold text-red-700">{result.summary.failed}</div>
                <div className="text-xs text-red-600">ล้มเหลว</div>
              </div>
            </div>
          </div>

          {/* Batches */}
          {result.batches && result.batches.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold">Payslip Batches (Odoo)</h3>
              <div className="space-y-3">
                {result.batches.map((batch) => (
                  <div key={batch.pay_day} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">
                      วันจ่าย {batch.pay_day} → {batch.payment_date}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      {batch.payslip_ids.length} payslip
                      {batch.batch_id ? ` · Batch ID ${batch.batch_id}` : " · (batch model unavailable)"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Table */}
          {result.results.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold">รายละเอียด</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="px-3 py-2">พนักงาน</th>
                      <th className="px-3 py-2">วันจ่าย</th>
                      <th className="px-3 py-2">Payslip ID</th>
                      <th className="px-3 py-2">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r, i) => (
                      <tr key={`${r.employee_id}-${i}`} className="border-b last:border-0">
                        <td className="px-3 py-2">{r.employee_name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {r.success ? `${r.payment_date} (ว.${r.pay_day})` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {r.success ? r.payslip_id : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {r.success ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              ✓ สำเร็จ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              ✗ {r.error || 'ล้มเหลว'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-red-900">ข้อผิดพลาด:</h4>
              <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Actions */}
          {result.summary.successful > 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                ✓ Sync สำเร็จแล้ว! ตรวจสอบ Payslips ได้ที่:{' '}
                <a
                  href="https://chinese-vibe2.odoo.com/web#action=hr_payroll.action_view_hr_payslip_month_form"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  Odoo Payroll → Payslips
                </a>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
