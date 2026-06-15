import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { PayslipsClient } from "@/app/portal/payslips/PayslipsClient"

export default async function PortalPayslipsPage() {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const supabase = await createClient()
  const { data: payslips } = await supabase
    .from("hr_payslips")
    .select(
      "id, payment_date, gross_amount, net_amount, status, pdf_path, run_id, hr_payroll_runs(period, period_start, period_end)"
    )
    .eq("employee_id", employee.id)
    .eq("status", "final")
    .order("payment_date", { ascending: false })

  const rows = (payslips ?? []).map((p) => {
    const run = p.hr_payroll_runs as
      | { period: string; period_start: string; period_end: string }
      | { period: string; period_start: string; period_end: string }[]
      | null
    const runData = Array.isArray(run) ? run[0] : run
    return {
      id: p.id as string,
      period: runData?.period ?? "—",
      periodStart: runData?.period_start ?? "",
      periodEnd: runData?.period_end ?? "",
      paymentDate: p.payment_date as string,
      grossAmount: Number(p.gross_amount),
      netAmount: Number(p.net_amount),
      hasPdf: Boolean(p.pdf_path),
    }
  })

  return (
    <AdminPageShell title="สลิปเงินเดือน" description="สลิปที่ HR lock แล้ว">
      <PayslipsClient rows={rows} />
    </AdminPageShell>
  )
}
