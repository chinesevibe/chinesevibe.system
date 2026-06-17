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
import type { AlertRow } from "@/features/alerts/types"

export function AlertTable({ rows }: { rows: AlertRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่มีรายการแจ้งเตือน (ใกล้ครบ 60 วัน หรือหมดอายุแล้ว)
      </p>
    )
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>พนักงาน</TableHead>
            <TableHead>แผนก</TableHead>
            <TableHead>วันครบ/หมดอายุ</TableHead>
            <TableHead>เหลือ</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>ดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.employeeId}-${row.dueDate}`}>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>{row.department ?? "—"}</TableCell>
              <TableCell>{row.dueDate}</TableCell>
              <TableCell className="tabular-nums">
                {row.daysLeft < 0
                  ? `หมดแล้ว ${Math.abs(row.daysLeft)} วัน`
                  : `${row.daysLeft} วัน`}
              </TableCell>
              <TableCell>
                <StatusPill
                  label={
                    row.daysLeft < 0
                      ? "หมดอายุ"
                      : row.daysLeft <= 7
                        ? "ด่วน"
                        : "ติดตาม"
                  }
                  variant={
                    row.daysLeft < 0
                      ? "rejected"
                      : row.daysLeft <= 7
                        ? "warning"
                        : "info"
                  }
                />
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/employees/${row.employeeId}`}
                  className="text-sm text-brand-red underline-offset-4 hover:underline"
                >
                  เปิดโปรไฟล์
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
