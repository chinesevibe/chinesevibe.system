import { DataTableShell } from "@/components/brand/DataTableShell"
import { StatusPill } from "@/components/brand/StatusPill"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AttendanceRow } from "@/features/attendance/types"

const STATUS_VARIANT: Record<
  AttendanceRow["status"],
  "approved" | "warning" | "info"
> = {
  normal: "approved",
  late: "warning",
  in_progress: "info",
}

export function EmployeeAttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลการเข้างาน
      </p>
    )
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่</TableHead>
            <TableHead>เข้า</TableHead>
            <TableHead>ออก</TableHead>
            <TableHead>ชม.</TableHead>
            <TableHead>สถานะ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.date}</TableCell>
              <TableCell>{row.checkInText}</TableCell>
              <TableCell>{row.checkOutText}</TableCell>
              <TableCell className="tabular-nums">
                {row.workHours?.toFixed(1) ?? "—"}
              </TableCell>
              <TableCell>
                <StatusPill
                  label={row.statusLabel}
                  variant={STATUS_VARIANT[row.status]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
