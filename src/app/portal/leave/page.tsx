import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { LeaveBalanceCard } from "@/features/leave/LeaveBalanceCard"
import { LeaveForm } from "@/features/leave/LeaveForm"
import { getEmployeeLeaveBalances } from "@/features/portal/data"
import { getCurrentEmployee } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"

export default async function PortalLeavePage() {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const balances = await getEmployeeLeaveBalances(employee.id)

  return (
    <AdminPageShell
      title="ขอลา"
      description="ยื่นคำขอลาและดูยอดคงเหลือ"
      action={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/liff/leave" className="inline-flex items-center gap-1.5">
              เปิดใน LIFF
              <ExternalLink className="size-3.5" />
            </Link>
          }
        />
      }
    >
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <LeaveBalanceCard balances={balances} />
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">แบบฟอร์มขอลา</h3>
          <LeaveForm />
        </div>
      </div>
    </AdminPageShell>
  )
}
