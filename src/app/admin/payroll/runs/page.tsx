import { PayrollRunsClient } from "@/app/admin/payroll/runs/PayrollRunsClient"
import { getPayrollConfig } from "@/lib/payroll/config"
import { requireRole } from "@/lib/auth/require-role"

export default async function PayrollRunsPage() {
  await requireRole("hr", "dev")

  const config = await getPayrollConfig()
  const now = new Date()
  const initialPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  return (
    <PayrollRunsClient
      defaultCutoffDay={config.payroll_cutoff_day}
      initialPeriod={initialPeriod}
    />
  )
}
