"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { WidgetCard } from "@/components/brand/WidgetCard"
import type { PayrollConfig } from "@/lib/payroll/config"
import { salaryFieldLabel } from "@/lib/payroll/pay-type"
import { NATIONALITY_OPTIONS, payDayLabel } from "@/lib/payroll/pay-day"

type FormState = {
  monthly_std_hours: string
  ot_multiplier: string
  sso_cap: string
  sso_rate: string
  work_entry_regular: string
  work_entry_ot: string
  work_entry_sick: string
  work_entry_annual: string
  odoo_monthly_struct_name: string
  odoo_hourly_struct_name: string
  payroll_cutoff_day: string
  tax_enabled: string
  tax_rate: string
  leave_sick_deduct_enabled: string
}

function toFormState(config: PayrollConfig): FormState {
  return {
    monthly_std_hours: String(config.monthly_std_hours),
    ot_multiplier: String(config.ot_multiplier),
    sso_cap: String(config.sso_cap),
    sso_rate: String(config.sso_rate),
    work_entry_regular: config.work_entry_regular,
    work_entry_ot: config.work_entry_ot,
    work_entry_sick: config.work_entry_sick,
    work_entry_annual: config.work_entry_annual,
    odoo_monthly_struct_name: config.odoo_monthly_struct_name,
    odoo_hourly_struct_name: config.odoo_hourly_struct_name,
    payroll_cutoff_day: String(config.payroll_cutoff_day),
    tax_enabled: config.tax_enabled ? "true" : "false",
    tax_rate: String(config.tax_rate),
    leave_sick_deduct_enabled: config.leave_sick_deduct_enabled ? "true" : "false",
  }
}

export function PayrollSettingsPanel({ initialConfig }: { initialConfig: PayrollConfig }) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialConfig))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch("/api/payroll/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) throw new Error(body?.error ?? "บันทึกไม่สำเร็จ")
      setMessage("บันทึกการตั้งค่าแล้ว")
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "mt-1 h-9 w-full max-w-xs rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

  return (
    <div className="flex flex-col gap-6">
      <WidgetCard title="คู่มือเงื่อนไขเงินเดือน">
        <p className="mb-4 text-sm text-muted-foreground">
          กำหนดประเภทการจ่ายและอัตราในโปรไฟล์พนักงาน — ระบบจะใช้ค่าดังนี้ตอนคำนวณเงินเดือน
        </p>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2">pay_type</th>
                <th className="px-3 py-2">ฟิลด์ salary</th>
                <th className="px-3 py-2">ชม.ที่นำมาคำนวณ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-3 py-2 font-medium">monthly (Office)</td>
                <td className="px-3 py-2">{salaryFieldLabel("monthly")}</td>
                <td className="px-3 py-2">เงินเดือนเต็ม + OT + ลา (บันทึกชม.)</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">hourly (หน้าร้าน)</td>
                <td className="px-3 py-2">{salaryFieldLabel("hourly")}</td>
                <td className="px-3 py-2">ชม.จาก ledger ที่อนุมัติแล้ว</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            <strong>วันจ่ายเงินเดือน:</strong> ไทย + พม่า → วันที่ <strong>4</strong> ·
            จีน → วันที่ <strong>5</strong> (จ่ายเดือนถัดไป) — ตั้งในโปรไฟล์พนักงาน
          </li>
          <li>
            คำนวณแล้วแยก batch วันจ่าย <strong>4</strong> / <strong>5</strong> อัตโนมัติ
          </li>
          <li>
            สัญชาติที่รองรับ:{" "}
            {NATIONALITY_OPTIONS.map((o) => `${o.label} (${payDayLabel(o.payDay)})`).join(" · ")}
          </li>
          <li>
            สาขา Head Office (รหัส <strong>000</strong>) → default{" "}
            <strong>monthly</strong> · สาขาอื่น → default <strong>hourly</strong>
          </li>
          <li>
            หลัง Lock รอบ → สร้าง PDF สลิป → พนักงานดูที่{" "}
            <Link href="/portal/payslips" className="font-medium text-brand-red hover:underline">
              Portal → สลิปเงินเดือน
            </Link>
          </li>
        </ul>
      </WidgetCard>

      <form onSubmit={onSave}>
        <WidgetCard title="ค่าที่ใช้คำนวณ (แก้ไขได้)">
          <p className="mb-4 text-sm text-muted-foreground">
            ค่าเหล่านี้ใช้ตอนคำนวณเงินเดือน — เปลี่ยนแล้วรอบถัดไปจะใช้ค่าใหม่
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-muted-foreground">ชม.มาตรฐาน/เดือน (OT สูตร monthly)</span>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={form.monthly_std_hours}
                onChange={(e) => setField("monthly_std_hours", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">OT multiplier</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={form.ot_multiplier}
                onChange={(e) => setField("ot_multiplier", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">SSO cap (บาท)</span>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={form.sso_cap}
                onChange={(e) => setField("sso_cap", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">SSO rate</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.001"
                className={inputClass}
                value={form.sso_rate}
                onChange={(e) => setField("sso_rate", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Work entry — ชม.ปกติ</span>
              <input
                className={inputClass}
                value={form.work_entry_regular}
                onChange={(e) => setField("work_entry_regular", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Work entry — OT</span>
              <input
                className={inputClass}
                value={form.work_entry_ot}
                onChange={(e) => setField("work_entry_ot", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Work entry — ลาป่วย</span>
              <input
                className={inputClass}
                value={form.work_entry_sick}
                onChange={(e) => setField("work_entry_sick", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Work entry — ลาพักร้อน</span>
              <input
                className={inputClass}
                value={form.work_entry_annual}
                onChange={(e) => setField("work_entry_annual", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">วันตัดรอบ default (1–31)</span>
              <input
                type="number"
                min="1"
                max="31"
                step="1"
                className={inputClass}
                value={form.payroll_cutoff_day}
                onChange={(e) => setField("payroll_cutoff_day", e.target.value)}
              />
            </label>
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-muted-foreground/40 p-4 opacity-70">
            <h4 className="text-sm font-semibold">หักภาษี (ปิดใช้งาน — Phase 5)</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              MVP ไม่คำนวณ PIT — เก็บ config ไว้เปิดทีหลัง
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted-foreground">tax_enabled</span>
                <select
                  className={inputClass}
                  value={form.tax_enabled}
                  disabled
                  onChange={(e) => setField("tax_enabled", e.target.value)}
                >
                  <option value="false">false</option>
                  <option value="true">true</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">tax_rate</span>
                <input
                  type="number"
                  className={inputClass}
                  value={form.tax_rate}
                  disabled
                  onChange={(e) => setField("tax_rate", e.target.value)}
                />
              </label>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-red/90">
              {saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}
            </Button>
            <Link href="/admin/payroll/runs" className="text-sm font-medium text-brand-red hover:underline">
              ไปคำนวณเงินเดือน
            </Link>
            {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </WidgetCard>
      </form>
    </div>
  )
}
