import Link from "next/link"

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
import { LEAVE_TYPE_LABELS } from "@/features/leave/types"
import { LeaveDecisionActions } from "@/features/leaves/LeaveDecisionActions"
import type { LeaveRequestRow } from "@/features/leaves/types"

const STATUS_LABEL = {
  pending: "รออนุมัติ",
  approved: "อนุมัติ",
  rejected: "ไม่อนุมัติ",
} as const

const STATUS_VARIANT = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const

export function LeaveTable({ rows }: { rows: LeaveRequestRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่พบคำขอลาตามเงื่อนไข
      </p>
    )
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>พนักงาน</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>วันที่</TableHead>
            <TableHead>วัน</TableHead>
            <TableHead>เหตุผล</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>ดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link
                  href={`/admin/employees/${row.employeeId}`}
                  className="font-medium text-brand-red underline-offset-4 hover:underline"
                >
                  {row.employeeName}
                </Link>
                {row.department ? (
                  <p className="text-xs text-muted-foreground">{row.department}</p>
                ) : null}
              </TableCell>
              <TableCell>{LEAVE_TYPE_LABELS[row.type]}</TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {row.startDate} – {row.endDate}
              </TableCell>
              <TableCell className="tabular-nums">{row.dayCount}</TableCell>
              <TableCell className="max-w-[200px] truncate text-sm">
                {row.reason ?? "—"}
              </TableCell>
              <TableCell>
                <StatusPill
                  label={STATUS_LABEL[row.status]}
                  variant={STATUS_VARIANT[row.status]}
                />
              </TableCell>
              <TableCell>
                <LeaveDecisionActions leave={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
