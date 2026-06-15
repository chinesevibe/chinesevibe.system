import { PayrollSubNav } from "@/features/payroll/PayrollSubNav"
import { requireRole } from "@/lib/auth/require-role"

export default async function PayrollLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole("hr", "admin", "dev")

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PayrollSubNav />
      {children}
    </div>
  )
}
