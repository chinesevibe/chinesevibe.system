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
import { OT_APPROVAL_LABELS, OT_STATUS_LABELS } from "@/features/overtime/types"
import { OvertimeDecisionActions } from "@/features/overtime/OvertimeDecisionActions"
import type { OvertimeRequestRow } from "@/features/overtime/data"

const VARIANT = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const

export function OvertimeTable({ rows }: { rows: OvertimeRequestRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">ไม่พบคำขอ OT</p>
    )
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>พนักงาน</TableHead>
            <TableHead>วันที่</TableHead>
            <TableHead>เวลา</TableHead>
            <TableHead>เหตุผล</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>ดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium">{row.employeeName}</div>
                <div className="text-xs text-muted-foreground">{row.department ?? "—"}</div>
              </TableCell>
              <TableCell>{row.workDate}</TableCell>
              <TableCell>
                {row.startTime} – {row.endTime}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{row.reason}</TableCell>
              <TableCell>
                <StatusPill
                  label={
                    OT_APPROVAL_LABELS[row.approvalStatus] ??
                    OT_STATUS_LABELS[row.status]
                  }
                  variant={
                    row.approvalStatus === "pending_hr" ||
                    row.approvalStatus === "pending_manager"
                      ? "pending"
                      : VARIANT[row.status]
                  }
                />
              </TableCell>
              <TableCell>
                <OvertimeDecisionActions ot={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
