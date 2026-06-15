import { BranchManagerDashboard } from "@/features/branch-dashboard/BranchManagerDashboard"
import { getBranchDashboardData } from "@/features/branch-dashboard/data"
import { requireRole } from "@/lib/auth/require-role"

export default async function BranchManagerDashboardPage() {
  const employee = await requireRole("branch_manager", "dev")
  const data = await getBranchDashboardData(employee)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BranchManagerDashboard
        userName={employee.name}
        data={data}
        unassigned={!data.branch}
      />
    </div>
  )
}
