import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { HrBranchHub } from "@/features/branches/HrBranchHub"
import {
  getBranchBySlug,
  getBranchEmployeesWithAlerts,
  getBranchHubDashboard,
  getBranchOvertimeQueue,
} from "@/features/branches/branch-hub-data"
import { listBranchManagerCandidates } from "@/features/branches/manager-candidates"
import { isCeo, isDev } from "@/lib/auth/roles"
import { requireRole } from "@/lib/auth/require-role"

export default async function HrBranchDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const employee = await requireRole("hr", "ceo", "dev")
  const { slug } = await params
  const readOnly = isCeo(employee.role) && !isDev(employee.role)

  const branch = await getBranchBySlug(slug)
  if (!branch) notFound()

  const [dashboard, employees, overtimeQueue, managerCandidates] = await Promise.all([
    getBranchHubDashboard(branch.id),
    getBranchEmployeesWithAlerts(branch.id),
    getBranchOvertimeQueue(branch.id),
    listBranchManagerCandidates(),
  ])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <p className="shrink-0 text-sm">
        <Link href="/admin/branches" className="text-brand-red hover:underline">
          ← กลับรายการสาขา
        </Link>
      </p>
      <AdminPageShell
        fill
        title={branch.name}
        description={`จัดการสาขา — พนักงาน ลา เข้างาน OT (${branch.code ?? "—"})`}
      >
        <HrBranchHub
          branch={branch}
          dashboard={dashboard}
          employees={employees}
          overtimeQueue={overtimeQueue}
          managerCandidates={managerCandidates}
          readOnly={readOnly}
        />
      </AdminPageShell>
    </div>
  )
}
