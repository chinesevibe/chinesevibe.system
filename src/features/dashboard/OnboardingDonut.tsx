"use client"

import { StatusDonutChart } from "@/features/dashboard/StatusDonutChart"

const ONBOARDING_COLORS = ["#10B981", "#F59E0B", "#EF4444"] as const

export function OnboardingDonut({
  data,
  compact = false,
}: {
  data: Array<{ name: string; value: number }>
  compact?: boolean
}) {
  return (
    <StatusDonutChart
      data={data}
      colors={ONBOARDING_COLORS}
      centerLabel="Total"
      emptyMessage="No onboarding data"
      compact={compact}
    />
  )
}
