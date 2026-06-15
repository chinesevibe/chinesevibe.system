import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DashboardStats } from "@/features/dashboard/data"

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        {detail ? (
          <CardDescription className="text-xs">{detail}</CardDescription>
        ) : null}
      </CardHeader>
    </Card>
  )
}

export function KpiCards({ stats }: { stats: DashboardStats }) {
  const expiringItems = [
    { label: "Probation ending", count: stats.expiring.probation },
    { label: "Visa expiring", count: stats.expiring.visa },
    { label: "Work permit expiring", count: stats.expiring.workPermit },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Employees" value={stats.totalActiveEmployees} />
        <KpiCard label="Checked In Today" value={stats.checkedInToday} />
        <KpiCard
          label="Late / Absent Today"
          value={stats.lateToday + stats.absentToday}
          detail={`${stats.lateToday} late · ${stats.absentToday} absent`}
        />
        <KpiCard label="Pending Leave Requests" value={stats.pendingLeaves} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>
            Expiring within the next 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {expiringItems.map(({ label, count }) => (
            <Badge
              key={label}
              variant={count > 0 ? "destructive" : "secondary"}
            >
              {label}: {count}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
