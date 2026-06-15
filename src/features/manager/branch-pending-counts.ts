import { getManagerAttendanceQueue, getManagerLeaveQueue } from "@/features/manager/data"
import type { Employee } from "@/lib/auth/session"

export type BranchPendingCounts = {
  attendance: number
  leaves: number
  total: number
}

export async function getBranchPendingCounts(
  caller: Employee
): Promise<BranchPendingCounts> {
  const [attendance, leaves] = await Promise.all([
    getManagerAttendanceQueue(caller),
    getManagerLeaveQueue(caller),
  ])
  return {
    attendance: attendance.length,
    leaves: leaves.length,
    total: attendance.length + leaves.length,
  }
}
