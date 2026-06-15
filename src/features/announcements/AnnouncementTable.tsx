import Image from "next/image"

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
import type { AnnouncementRow } from "@/features/announcements/data"
import { formatThaiDateTime } from "@/lib/datetime/thailand"

export function AnnouncementTable({ rows }: { rows: AnnouncementRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ยังไม่มีประกาศ
      </p>
    )
  }

  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>หัวข้อ</TableHead>
            <TableHead>กลุ่มเป้าหมาย</TableHead>
            <TableHead>สถานะ</TableHead>
            <TableHead>วันที่</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-start gap-3">
                  {row.imageUrl ? (
                    <Image
                      src={row.imageUrl}
                      alt=""
                      width={56}
                      height={56}
                      unoptimized
                      className="size-14 shrink-0 rounded-md border object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="font-medium">{row.title}</div>
                    <div className="max-w-[320px] truncate text-xs text-muted-foreground">
                      {row.body}
                    </div>
                    {row.imageUrl ? (
                      <p className="mt-1 text-[10px] text-muted-foreground">มีรูปแนบ</p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {row.targetType === "all"
                  ? "ทุกคน"
                  : `แผนก: ${row.targetValue ?? "—"}`}
              </TableCell>
              <TableCell>
                <StatusPill
                  label={
                    row.status === "sent"
                      ? "ส่งแล้ว"
                      : row.status === "scheduled"
                        ? "ตั้งเวลา"
                        : "แบบร่าง"
                  }
                  variant={row.status === "sent" ? "approved" : "pending"}
                />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatThaiDateTime(row.sentAt ?? row.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  )
}
