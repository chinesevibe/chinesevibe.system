import { HrAdminDashboard } from "@/features/dashboard/HrAdminDashboard"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function AdminDashboardPage() {
  const employee = await getCurrentEmployee()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <HrAdminDashboard userName={employee?.name ?? "Admin"} />
    </div>
  )
}
