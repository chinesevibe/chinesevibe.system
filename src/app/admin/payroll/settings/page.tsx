import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PayrollSettingsPanel } from "@/features/payroll/PayrollSettingsPanel"
import { getPayrollConfig } from "@/lib/payroll/config"
import { requireRole } from "@/lib/auth/require-role"

export default async function PayrollSettingsPage() {
  await requireRole("hr", "admin", "dev")

  const config = await getPayrollConfig()

  return (
    <AdminPageShell
      title="ตั้งค่าระบบเงินเดือน"
      description="เงื่อนไขการจ่ายเงิน + ค่าที่ใช้คำนวณเงินเดือนในระบบ"
    >
      <PayrollSettingsPanel initialConfig={config} />
    </AdminPageShell>
  )
}
