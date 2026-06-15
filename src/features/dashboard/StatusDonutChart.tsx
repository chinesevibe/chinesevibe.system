"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"

export function StatusDonutChart({
  data,
  colors,
  centerLabel,
  emptyMessage = "No data",
  compact = false,
  denseLegend = false,
}: {
  data: Array<{ name: string; value: number }>
  colors: readonly string[]
  centerLabel: string
  emptyMessage?: string
  compact?: boolean
  denseLegend?: boolean
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const chartSize = compact ? "size-36" : "size-44"
  const minHeight = compact ? "min-h-[9.5rem]" : "min-h-[12rem]"

  if (total === 0) {
    return (
      <div
        className={`flex ${minHeight} items-center justify-center text-sm text-muted-foreground`}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-5 ${minHeight}`}>
      <div className={`relative ${chartSize} shrink-0`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="68%"
              outerRadius="95%"
              stroke="#fff"
              strokeWidth={2}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
          <span
            className={
              compact
                ? "text-2xl font-bold leading-none tabular-nums text-foreground"
                : "text-3xl font-bold leading-none tabular-nums text-foreground"
            }
          >
            {total}
          </span>
          <span className="mt-1 max-w-[4.5rem] text-[10px] leading-tight text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul
        className={
          denseLegend
            ? "min-w-0 flex-1 space-y-2"
            : "min-w-0 flex-1 space-y-2.5"
        }
      >
        {data.map((entry, index) => {
          const pct = Math.round((entry.value / total) * 100)
          return (
            <li
              key={entry.name}
              className="flex items-center gap-2.5 text-sm leading-tight"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 font-medium text-foreground">
                {entry.name}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {entry.value} ({pct}%)
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
