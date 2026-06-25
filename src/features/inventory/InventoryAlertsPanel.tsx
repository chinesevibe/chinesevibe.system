import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

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

function severityLabel(severity: InventoryAlertRow["severity"]) {
  if (severity === "high") return "สูง"
  if (severity === "medium") return "กลาง"
  return "ทั่วไป"
}

const TYPE_LABELS: Record<InventoryAlertRow["type"], string> = {
  expiry: "ใกล้หมดอายุ",
  low_stock: "สต็อกต่ำ",
  anomaly: "ผิดปกติ",
}

function actionLabel(type: InventoryAlertRow["type"]) {
  if (type === "expiry") return "ดูล็อต"
  if (type === "low_stock") return "ดูสต็อก"
  return "ดูสาเหตุ"
}

function metricLabel(row: InventoryAlertRow) {
  if (row.type === "expiry" && row.daysLeft != null) {
    return `เหลือ ${row.daysLeft} วัน`
  }
  if (row.type === "low_stock" && row.qty != null) {
    return `คงเหลือ ${row.qty}`
  }
  if (row.type === "anomaly" && row.value != null) {
    return `${new Intl.NumberFormat("th-TH").format(row.value)} บาท`
  }
  return ""
}

export function InventoryAlertsPanel({ rows }: { rows: InventoryAlertRow[] }) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{TYPE_LABELS[row.type]}</p>
                  <p className="mt-1 text-sm text-foreground">{row.title}</p>
                </div>
                <StatusPill label={severityLabel(row.severity)} variant={severityVariant(row.severity)} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{row.detail}</p>
              {metricLabel(row) ? (
                <div className="mt-3">
                  <span className="rounded-full border border-border/80 bg-muted/20 px-2.5 py-1 text-xs text-foreground">
                    {metricLabel(row)}
                  </span>
                </div>
              ) : null}
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">สาขา:</span> {row.branchName}
                </p>
                <p>
                  <span className="text-muted-foreground">คลัง:</span> {row.warehouseName ?? "—"}
                </p>
              </div>
              <div className="mt-3 flex justify-end">
                <Link href={row.href} className="inline-flex items-center gap-1 text-brand-red hover:underline">
                  {actionLabel(row.type)}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีรายการเตือน
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
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
                    <div className="flex flex-col gap-1">
                      <StatusPill label={severityLabel(row.severity)} variant={severityVariant(row.severity)} />
                      {metricLabel(row) ? (
                        <span className="text-xs text-muted-foreground">{metricLabel(row)}</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={row.href} className="inline-flex items-center gap-1 text-brand-red hover:underline">
                      {actionLabel(row.type)}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  ยังไม่มีรายการเตือน
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
