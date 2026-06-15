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
import { DOC_TYPE_LABELS } from "@/features/documents/types"
import { DocumentDecisionActions } from "@/features/documents/DocumentDecisionActions"
import type { DocumentRequestRow } from "@/features/documents/data"

import { DOC_STATUS_LABELS } from "@/features/documents/types"

const STATUS_VARIANT = {
  pending: "pending",
  on_hold: "warning",
  processing: "pending",
  ready: "approved",
  completed: "approved",
  rejected: "rejected",
} as const

export function DocumentTable({ rows }: { rows: DocumentRequestRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่พบคำขอเอกสาร
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
            <TableHead>ชุด</TableHead>
            <TableHead>วัตถุประสงค์</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>ดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="font-medium">{row.employeeName}</div>
                <div className="text-xs text-muted-foreground">
                  {row.department ?? "—"}
                </div>
              </TableCell>
              <TableCell>{DOC_TYPE_LABELS[row.docType]}</TableCell>
              <TableCell>{row.copies}</TableCell>
              <TableCell className="max-w-[200px] truncate">{row.purpose}</TableCell>
              <TableCell>
                <StatusPill
                  label={DOC_STATUS_LABELS[row.status]}
                  variant={STATUS_VARIANT[row.status]}
                />
              </TableCell>
              <TableCell>
                <DocumentDecisionActions doc={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
