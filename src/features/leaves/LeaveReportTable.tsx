import { DataTableShell } from "@/components/brand/DataTableShell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { LeaveReportRow } from "@/features/leaves/insights"

export function LeaveReportTable({
  month,
  rows,
}: {
  month: string
  rows: LeaveReportRow[]
}) {
  const totalDays = rows.reduce((s, r) => s + r.totalDays, 0)
  const totalRequests = rows.reduce((s, r) => s + r.requestCount, 0)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        สรุปการลาที่อนุมัติแล้ว — เดือน {month}
      </p>
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ประเภท</TableHead>
              <TableHead>จำนวนคำขอ</TableHead>
              <TableHead>วันลารวม</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.type}>
                <TableCell>{row.typeLabel}</TableCell>
                <TableCell className="tabular-nums">{row.requestCount}</TableCell>
                <TableCell className="tabular-nums">{row.totalDays}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-medium">รวม</TableCell>
              <TableCell className="font-medium tabular-nums">
                {totalRequests}
              </TableCell>
              <TableCell className="font-medium tabular-nums">{totalDays}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  )
}
