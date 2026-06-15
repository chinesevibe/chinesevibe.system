import { Fragment } from "react"

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
import { ComplaintConversation } from "@/features/complaints/ComplaintConversation"
import { ComplaintReplyActions } from "@/features/complaints/ComplaintReplyActions"
import { COMPLAINT_STATUS_LABELS } from "@/features/complaints/types"
import type { ComplaintRow } from "@/features/complaints/data"

const STATUS_VARIANT = {
  open: "pending",
  replied: "approved",
  closed: "rejected",
} as const

export function ComplaintTable({ rows }: { rows: ComplaintRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่พบเรื่องร้องเรียน
      </p>
    )
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>เลขที่</TableHead>
            <TableHead>หัวข้อ</TableHead>
            <TableHead>ผู้แจ้ง</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead className="w-[280px]">ตอบกลับ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <Fragment key={row.id}>
              <TableRow>
                <TableCell className="align-top font-mono text-xs">
                  {row.ticketCode}
                </TableCell>
                <TableCell className="align-top">
                  <div className="font-medium">{row.subject}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.replies.length > 0
                      ? `${row.replies.length} คำตอบจาก HR`
                      : "ยังไม่มีคำตอบ"}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  {row.isAnonymous ? (
                    <span className="text-xs text-muted-foreground">นิรนาม</span>
                  ) : (
                    <>
                      <div>{row.employeeName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.department ?? "—"}
                      </div>
                    </>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <StatusPill
                    label={COMPLAINT_STATUS_LABELS[row.status]}
                    variant={STATUS_VARIANT[row.status]}
                  />
                </TableCell>
                <TableCell className="align-top">
                  <ComplaintReplyActions complaint={row} />
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/15 hover:bg-muted/15">
                <TableCell colSpan={5} className="py-3">
                  <ComplaintConversation complaint={row} />
                </TableCell>
              </TableRow>
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
