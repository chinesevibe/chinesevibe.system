"use client"

import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export function BranchAttendanceDonut({
  data,
  presentRate,
}: {
  data: Array<{ name: string; value: number; color: string }>
  presentRate: number
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
        No attendance data today
      </div>
    )
  }

  return (
    <div className="relative h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold">{presentRate}%</p>
          <p className="text-xs text-muted-foreground">Present</p>
        </div>
      </div>
    </div>
  )
}

export function BranchWeekTrend({
  data,
}: {
  data: Array<{ day: string; rate: number }>
}) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
          <Tooltip formatter={(v) => [`${v ?? 0}%`, "Attendance"]} />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BranchPerformanceTrend({
  weekTrend,
  presentRate,
  otHours,
  leaveRate,
}: {
  weekTrend: Array<{ day: string; rate: number }>
  presentRate: number
  otHours: number
  leaveRate: number
}) {
  const leaveTrend = weekTrend.map((d) => ({
    ...d,
    leaveRate: Math.max(0, 100 - d.rate - 5),
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Attendance Rate</p>
          <p className="text-lg font-semibold">{presentRate}%</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">OT Hours</p>
          <p className="text-lg font-semibold">{otHours}h</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">On Leave Rate</p>
          <p className="text-lg font-semibold">{leaveRate}%</p>
        </div>
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={leaveTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="rate"
              name="Attendance %"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="leaveRate"
              name="Leave %"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
