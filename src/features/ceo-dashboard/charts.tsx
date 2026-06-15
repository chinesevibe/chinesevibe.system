"use client"

import { useState } from "react"

import { formatPayrollHours } from "@/lib/payroll/format-hours"
import { cn } from "@/lib/utils"
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

const ATTENDANCE_COLORS: Record<string, string> = {
  Present: "#22c55e",
  Late: "#f59e0b",
  Absent: "#ef4444",
  "On Leave": "#3b82f6",
}

const PAYROLL_COLORS: Record<string, string> = {
  Regular: "#22c55e",
  Overtime: "#f59e0b",
  "Sick (hours)": "#3b82f6",
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
}

type Slice = { name: string; value: number; color?: string }

function sliceColor(entry: Slice, index: number, palette: Record<string, string>) {
  return entry.color ?? palette[entry.name] ?? CHART_COLORS[index % CHART_COLORS.length]
}

function CompactDonutLegend({
  data,
  colors,
  valueSuffix = "",
  hovered,
  onHover,
}: {
  data: Slice[]
  colors: Record<string, string> | readonly string[]
  valueSuffix?: string
  hovered: string | null
  onHover: (name: string | null) => void
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  return (
    <ul className="min-w-0 flex-1 space-y-1">
      {data.map((entry, index) => {
        const pct = Math.round((entry.value / total) * 100)
        const fill =
          typeof colors === "object" && !Array.isArray(colors)
            ? sliceColor(entry, index, colors as Record<string, string>)
            : (colors as readonly string[])[index % colors.length]
        const dimmed = hovered !== null && hovered !== entry.name
        return (
          <li
            key={entry.name}
            className={cn(
              "flex cursor-default items-center gap-1.5 rounded-md px-1 py-0.5 text-[10px] leading-tight transition-opacity",
              dimmed ? "opacity-45" : "opacity-100"
            )}
            onMouseEnter={() => onHover(entry.name)}
            onMouseLeave={() => onHover(null)}
          >
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: fill }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-medium">{entry.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {valueSuffix === "h"
                ? formatPayrollHours(entry.value)
                : entry.value}
              {valueSuffix} ({pct}%)
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function CompactDonut({
  data,
  colors,
  centerValue,
  centerLabel,
  valueSuffix = "",
  emptyMessage,
}: {
  data: Slice[]
  colors: Record<string, string> | readonly string[]
  centerValue: string
  centerLabel: string
  valueSuffix?: string
  emptyMessage: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const total = data.reduce((s, d) => s + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex min-h-[7rem] items-center justify-center text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  const palette =
    typeof colors === "object" && !Array.isArray(colors)
      ? (colors as Record<string, string>)
      : {}

  return (
    <div className="flex min-h-[7rem] items-center gap-3">
      <div className="relative size-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={sliceColor(entry, index, palette)}
                  opacity={hovered === null || hovered === entry.name ? 1 : 0.4}
                  className="cursor-pointer outline-none transition-opacity duration-150"
                  onMouseEnter={() => setHovered(entry.name)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => [
                valueSuffix === "h"
                  ? `${formatPayrollHours(Number(value ?? 0))}${valueSuffix}`
                  : `${value ?? 0}${valueSuffix}`,
                String(name),
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
          <span className="text-lg font-bold leading-none tabular-nums">
            {centerValue}
          </span>
          <span className="mt-0.5 max-w-[4rem] text-[9px] leading-tight text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>
      <CompactDonutLegend
        data={data}
        colors={colors}
        valueSuffix={valueSuffix}
        hovered={hovered}
        onHover={setHovered}
      />
    </div>
  )
}

export function CeoAttendanceDonut({
  data,
  presentRate,
}: {
  data: Array<{ name: string; value: number; color: string }>
  presentRate: number
}) {
  return (
    <CompactDonut
      data={data}
      colors={ATTENDANCE_COLORS}
      centerValue={`${presentRate}%`}
      centerLabel="Present"
      emptyMessage="No attendance data today"
    />
  )
}

export function CeoPayrollDonut({
  data,
  totalHours,
}: {
  data: Array<{ name: string; value: number; color: string }>
  totalHours: number
}) {
  return (
    <CompactDonut
      data={data}
      colors={PAYROLL_COLORS}
      centerValue={`${formatPayrollHours(totalHours)}h`}
      centerLabel="Total hours"
      valueSuffix="h"
      emptyMessage="No payroll hours this period"
    />
  )
}

export function CeoWeekTrend({
  data,
}: {
  data: Array<{ day: string; rate: number }>
}) {
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 6, right: 8, left: -18, bottom: 0 }}
        >
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={26}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [`${v ?? 0}%`, "Attendance rate"]}
            labelFormatter={(label) => `Day ${label}`}
            cursor={{
              stroke: "var(--chart-1)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            dot={{
              r: 3,
              fill: "var(--chart-1)",
              stroke: "#fff",
              strokeWidth: 1.5,
            }}
            activeDot={{
              r: 5,
              fill: "var(--chart-1)",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
