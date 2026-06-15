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
import { DOC_STATUS_LABELS } from "@/features/documents/types"
import {
  DOC_TYPE_LABELS,
  type EmployeeDocumentRow,
} from "@/features/portal/data"
import { formatThaiDate } from "@/lib/datetime/thailand"

const STATUS_VARIANT = {
  pending: "pending",
  on_hold: "warning",
  processing: "pending",
  ready: "approved",
  completed: "approved",
  rejected: "rejected",
} as const

function formatDate(iso: string): string {
  return formatThaiDate(iso, { day: "numeric", month: "short", year: "numeric" })
}

export function EmployeeDocumentTable({ rows }: { rows: EmployeeDocumentRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ยังไม่มีคำขอเอกสาร — สามารถขอเอกสารได้จากเมนู LIFF หรือปุ่มด้านล่าง
      </p>
    )
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>วันที่ขอ</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>ชุด</TableHead>
            <TableHead>วัตถุประสงค์</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>ไฟล์</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap">
                {formatDate(row.createdAt)}
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
                {row.resultFileUrl ? (
                  <Link
                    href={row.resultFileUrl}
                    target="_blank"
                    className="text-sm font-medium text-brand-red hover:underline"
                  >
                    ดาวน์โหลด
                  </Link>
                ) : row.hrNote ? (
                  <span className="text-xs text-muted-foreground">{row.hrNote}</span>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
