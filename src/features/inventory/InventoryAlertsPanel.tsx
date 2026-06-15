import Link from "next/link"

import { StatusPill } from "@/components/brand/StatusPill"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { InventoryAlertRow } from "@/features/inventory/expansion-data"

function severityVariant(severity: InventoryAlertRow["severity"]) {
  if (severity === "high") return "rejected" as const
  if (severity === "medium") return "pending" as const
  return "neutral" as const
}

const TYPE_LABELS: Record<InventoryAlertRow["type"], string> = {
  expiry: "ใกล้หมดอายุ",
  low_stock: "สต็อกต่ำ",
  anomaly: "ผิดปกติ",
}

export function InventoryAlertsPanel({ rows }: { rows: InventoryAlertRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ประเภท</TableHead>
            <TableHead>รายละเอียด</TableHead>
            <TableHead>สาขา</TableHead>
            <TableHead>คลัง</TableHead>
            <TableHead>ระดับ</TableHead>
            <TableHead>ไปยังหน้า</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{TYPE_LABELS[row.type]}</TableCell>
                <TableCell>
                  <p className="font-medium">{row.title}</p>
                  <p className="text-xs text-muted-foreground">{row.detail}</p>
                </TableCell>
                <TableCell>{row.branchName}</TableCell>
                <TableCell>{row.warehouseName ?? "—"}</TableCell>
                <TableCell>
                  <StatusPill label={row.severity} variant={severityVariant(row.severity)} />
                </TableCell>
                <TableCell>
                  <Link href={row.href} className="text-brand-red hover:underline">
                    เปิด
                  </Link>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                ยังไม่มี alerts
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
