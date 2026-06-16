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
import {
  AttendanceEditButton,
  AttendanceLocationReviewActions,
} from "@/features/attendance/AttendanceHrActions"
import type { AttendanceRow } from "@/features/attendance/types"

const STATUS_VARIANT: Record<
  AttendanceRow["status"],
  "approved" | "warning" | "info"
> = {
  normal: "approved",
  late: "warning",
  in_progress: "info",
}

const REVIEW_VARIANT: Record<
  AttendanceRow["locationReviewStatus"],
  "approved" | "warning" | "info" | "rejected"
> = {
  clear: "approved",
  approved: "approved",
  pending_hr: "info",
  rejected: "rejected",
}

export function AttendanceTable({
  rows,
  canManage = false,
}: {
  rows: AttendanceRow[]
  canManage?: boolean
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่พบข้อมูลการเข้างานตามเงื่อนไข
      </p>
    )
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่</TableHead>
            <TableHead>พนักงาน</TableHead>
            <TableHead>แผนก</TableHead>
            <TableHead>เข้า</TableHead>
            <TableHead>ออก</TableHead>
            <TableHead>ชม.</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>ตรวจพิกัด</TableHead>
            {canManage ? <TableHead className="w-[220px]" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.date}</TableCell>
              <TableCell className="font-medium">{row.employeeName}</TableCell>
              <TableCell>{row.department ?? "—"}</TableCell>
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
              <TableCell>
                <div className="space-y-1">
                  <StatusPill
                    label={row.locationReviewLabel}
                    variant={REVIEW_VARIANT[row.locationReviewStatus]}
                  />
                  {row.locationReviewFlags.length > 0 ? (
                    <p className="max-w-xs text-xs text-muted-foreground">
                      {row.locationReviewFlags.join(", ")}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              {canManage ? (
                <TableCell>
                  <div className="space-y-2">
                    <AttendanceEditButton row={row} />
                    <AttendanceLocationReviewActions row={row} />
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
