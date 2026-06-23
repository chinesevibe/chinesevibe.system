import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getPayrollHourReport } from "@/features/payroll/data"
import { payTypeDisplayLabel, salaryFieldLabel } from "@/lib/payroll/pay-type"
import { formatPayrollHours } from "@/lib/payroll/format-hours"
import type { PayType } from "@/lib/payroll/pay-type"
import { requireRole } from "@/lib/auth/require-role"
import { createClient } from "@/lib/supabase/server"

export default async function AdminPayrollPage() {
  await requireRole("hr", "dev")

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const supabase = await createClient()
  const [report, employeesRes] = await Promise.all([
    getPayrollHourReport(year, month),
    supabase
      .from("hr_employees")
      .select("id, name, department, salary, pay_type, status")
      .eq("status", "active")
      .order("name")
      .limit(50),
  ])

  const employees = employeesRes.data ?? []

  return (
    <AdminPageShell
      title="Payroll Hub"
      description={`สรุปชม.การทำงานที่อนุมัติแล้ว — ${month}/${year}`}
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/admin/payroll/runs"
          className="rounded-lg border-2 border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100"
        >
          คำนวณเงินเดือน
        </Link>
        <Link
          href="/admin/payroll/settings"
          className="rounded-lg border-2 border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
        >
          ตั้งค่าเงินเดือน
        </Link>
      </div>

      <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <strong>Workflow:</strong> เลือกเดือน + วันตัดรอบ → คำนวณ → Lock รอบ → สร้าง PDF สลิป ·{" "}
        พนักงานดูสลิปที่{" "}
        <Link href="/portal/payslips" className="font-medium underline">
          Portal → สลิปเงินเดือน
        </Link>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Office (monthly):</strong> เงินเดือนในโปรไฟล์ + OT ตามชม.ที่อนุมัติ ·{" "}
        <strong>หน้าร้าน (hourly):</strong> ชม.จาก ledger ที่อนุมัติ × อัตราชั่วโมง
      </div>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold">ชม.ที่อนุมัติแล้ว (เดือนนี้ — hourly)</h3>
        {report.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีชม.ที่บันทึกใน ledger</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-3 py-2">พนักงาน</th>
                  <th className="px-3 py-2">แผนก</th>
                  <th className="px-3 py-2">ชม.ปกติ</th>
                  <th className="px-3 py-2">OT</th>
                  <th className="px-3 py-2">ลาป่วย (ชม.)</th>
                  <th className="px-3 py-2">รวม</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={`${r.name}-${r.department}`} className="border-b last:border-0">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.department}</td>
                    <td className="px-3 py-2">{formatPayrollHours(r.regular)}</td>
                    <td className="px-3 py-2">{formatPayrollHours(r.overtime)}</td>
                    <td className="px-3 py-2">{formatPayrollHours(r.sick)}</td>
                    <td className="px-3 py-2 font-medium">
                      {formatPayrollHours(r.regular + r.overtime + r.sick)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">อัตราที่บันทึก (ใช้คำนวณเงินเดือน)</h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2">พนักงาน</th>
                <th className="px-3 py-2">แผนก</th>
                <th className="px-3 py-2">ประเภท</th>
                <th className="px-3 py-2">อัตรา (บันทึก)</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const payType = (e.pay_type as PayType | null) ?? "hourly"
                return (
                  <tr key={e.id as string} className="border-b last:border-0">
                    <td className="px-3 py-2">{e.name as string}</td>
                    <td className="px-3 py-2">{(e.department as string) ?? "—"}</td>
                    <td className="px-3 py-2">{payTypeDisplayLabel(payType)}</td>
                    <td className="px-3 py-2">
                      {e.salary != null ? (
                        <>
                          {Number(e.salary).toLocaleString("th-TH")}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({salaryFieldLabel(payType).replace(/.*\(/, "").replace(/\)/, "")})
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPageShell>
  )
}
