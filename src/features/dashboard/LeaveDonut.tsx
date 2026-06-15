"use client"

import { StatusDonutChart } from "@/features/dashboard/StatusDonutChart"

const LEAVE_STATUS_LABELS = {
  pending: "รออนุมัติ",
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
} as const

const LEAVE_STATUS_ORDER = ["pending", "approved", "rejected"] as const

const LEAVE_COLORS = ["#F59E0B", "#10B981", "#EF4444"] as const

export function mapLeavesByStatusForDonut(
  items: Array<{ status: string; count: number }>
): Array<{ name: string; value: number }> {
  const counts = new Map(items.map((item) => [item.status, item.count]))

  return LEAVE_STATUS_ORDER.map((status) => ({
    name: LEAVE_STATUS_LABELS[status],
    value: counts.get(status) ?? 0,
  })).filter((segment) => segment.value > 0)
}

export function LeaveDonut({
  data,
  compact = false,
}: {
  data: Array<{ status: string; count: number }>
  compact?: boolean
}) {
  return (
    <StatusDonutChart
      data={mapLeavesByStatusForDonut(data)}
      colors={LEAVE_COLORS}
      centerLabel="Total"
      emptyMessage="ยังไม่มีใบลา"
      compact={compact}
    />
  )
}
