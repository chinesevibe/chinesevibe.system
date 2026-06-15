"use client"

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function LeaveStatusPie({
  data,
  compact = false,
}: {
  data: Array<{ status: string; count: number }>
  compact?: boolean
}) {
  const chartHeight = compact ? "h-28" : "h-64"

  if (data.length === 0) {
    return (
      <div
        className={`flex ${chartHeight} items-center justify-center text-sm text-muted-foreground`}
      >
        No leave requests yet
      </div>
    )
  }

  return (
    <div className={`${chartHeight} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius="45%"
            outerRadius="75%"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.status}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
