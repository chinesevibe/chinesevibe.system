import {
  getEmployeeAnnouncements,
  getEmployeeLeaveBalances,
  getTodayAttendanceStatus,
} from "@/features/portal/data"
import { PortalHomeDashboard } from "@/features/portal/PortalHomeDashboard"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function PortalHomePage() {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  const [attendance, balances, announcements] = await Promise.all([
    getTodayAttendanceStatus(employee.id),
    getEmployeeLeaveBalances(employee.id),
    getEmployeeAnnouncements(employee.department),
  ])

  return (
    <PortalHomeDashboard
      employeeName={employee.name}
      attendance={attendance}
      balances={balances}
      announcements={announcements}
    />
  )
}
