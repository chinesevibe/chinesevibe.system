"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { ClipboardList, PackageCheck, Send, Truck } from "lucide-react"

import { StatusPill } from "@/components/brand/StatusPill"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  cancelTransfer,
  receiveTransfer,
  sendTransfer,
  type InvTransferDetail,
} from "@/features/inventory/actions/transfer"
import { formatThaiDate } from "@/lib/datetime/thailand"

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

function unitLabel(item: InvTransferDetail["items"][number]) {
  if (!item.unit_name) return ""
  return item.unit_abbreviation ? `${item.unit_name} (${item.unit_abbreviation})` : item.unit_name
}

function statusVariant(status: InvTransferDetail["transfer"]["status"]) {
  if (status === "received") return "approved" as const
  if (status === "in_transit") return "pending" as const
  if (status === "cancelled") return "rejected" as const
  return "neutral" as const
}

const STATUS_LABELS: Record<InvTransferDetail["transfer"]["status"], string> = {
  draft: "ร่าง",
  in_transit: "กำลังโอน",
  received: "รับแล้ว",
  cancelled: "ยกเลิก",
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Truck
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-brand-red">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

export function TransferDetailView({
  detail,
  canManage,
}: {
  detail: InvTransferDetail
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [shipper, setShipper] = useState(detail.transfer.shipper ?? "")
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(detail.items.map((item) => [item.id, String(item.qty_sent)]))
  )

  const totalSent = useMemo(
    () => detail.items.reduce((sum, item) => sum + item.qty_sent, 0),
    [detail.items]
  )
  const totalReceived = useMemo(
    () => detail.items.reduce((sum, item) => sum + item.qty_received, 0),
    [detail.items]
  )

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error ?? "ดำเนินการไม่สำเร็จ")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="สถานะใบโอน"
          value={STATUS_LABELS[detail.transfer.status]}
          hint="ไหลจาก draft → in transit → received"
        />
        <SummaryCard
          icon={Truck}
          label="เส้นทางโอน"
          value={`${detail.transfer.from_branch_name} → ${detail.transfer.to_branch_name}`}
          hint="ใช้ยืนยันต้นทางและปลายทางของการเคลื่อนย้าย"
        />
        <SummaryCard
          icon={Send}
          label="รวมส่ง"
          value={formatQuantity(totalSent)}
          hint={`จาก ${detail.transfer.from_warehouse_name} ไป ${detail.transfer.to_warehouse_name}`}
        />
        <SummaryCard
          icon={PackageCheck}
          label="รวมรับ"
          value={formatQuantity(totalReceived)}
          hint="ช่วยดูเร็วว่าปลายทางรับครบแล้วหรือยัง"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusPill label={STATUS_LABELS[detail.transfer.status]} variant={statusVariant(detail.transfer.status)} />
        <span className="text-sm text-muted-foreground">
          สร้าง {formatThaiDate(detail.transfer.created_at)}
          {detail.transfer.sent_at ? ` · ส่ง ${formatThaiDate(detail.transfer.sent_at)}` : ""}
          {detail.transfer.received_at ? ` · รับ ${formatThaiDate(detail.transfer.received_at)}` : ""}
        </span>
      </div>

      <div className="grid gap-2 rounded-xl border border-border p-4 text-sm md:grid-cols-2">
        <p><span className="font-medium">ต้นทาง:</span> {detail.transfer.from_branch_name} · {detail.transfer.from_warehouse_name}</p>
        <p><span className="font-medium">ปลายทาง:</span> {detail.transfer.to_branch_name} · {detail.transfer.to_warehouse_name}</p>
        <p><span className="font-medium">ผู้สร้าง:</span> {detail.transfer.created_by_name}</p>
        <p><span className="font-medium">ผู้ขนส่ง:</span> {detail.transfer.shipper ?? "—"}</p>
        <p><span className="font-medium">รวมส่ง:</span> {formatQuantity(totalSent)}</p>
        <p><span className="font-medium">รวมรับ:</span> {formatQuantity(totalReceived)}</p>
        {detail.transfer.notes ? (
          <p className="md:col-span-2"><span className="font-medium">หมายเหตุ:</span> {detail.transfer.notes}</p>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">รายการโอนและส่วนต่าง</h2>
            <p className="text-xs text-muted-foreground">
              ใช้ตรวจจำนวนที่ส่ง จำนวนที่รับ lot และ variance ก่อนกดยืนยันขั้นถัดไป
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {detail.items.length.toLocaleString("th-TH")} รายการ
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>ส่ง</TableHead>
              <TableHead>รับ</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>ส่วนต่าง</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.items.map((item) => {
              const variance = item.qty_sent - item.qty_received
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku_code}</TableCell>
                  <TableCell>{item.sku_name}</TableCell>
                  <TableCell>{formatQuantity(item.qty_sent)} {unitLabel(item)}</TableCell>
                  <TableCell>{formatQuantity(item.qty_received)}</TableCell>
                  <TableCell>{item.lot_number || "—"}</TableCell>
                  <TableCell>{variance > 0 ? formatQuantity(variance) : "—"}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </section>

      {detail.transfer.status === "draft" && canManage ? (
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">ส่งออกจากต้นทาง</h2>
          <p className="mt-1 text-sm text-muted-foreground">การส่งจะหักสต็อกจากคลังต้นทางทันที และบันทึก movement type = transfer_out</p>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-muted-foreground">ผู้ขนส่ง</span>
            <input className="h-10 w-full rounded-lg border border-input px-3 text-sm" value={shipper} onChange={(e) => setShipper(e.target.value)} />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => runAction(() => sendTransfer({ transfer_id: detail.transfer.id, shipper }))}>
              ส่งสินค้า
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => runAction(() => cancelTransfer({ transfer_id: detail.transfer.id }))}
            >
              ยกเลิกใบโอน
            </Button>
          </div>
        </section>
      ) : null}

      {detail.transfer.status === "in_transit" && canManage ? (
        <section className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">รับเข้าคลังปลายทาง</h2>
            <p className="mt-1 text-sm text-muted-foreground">รองรับรับบางส่วนได้ แต่จำนวนรับต้องไม่เกินจำนวนส่ง</p>
          </div>
          <div className="grid gap-3">
            {detail.items.map((item) => (
              <label key={item.id} className="grid gap-1 text-sm md:grid-cols-[1fr_180px]">
                <span>{item.sku_code} — ส่ง {formatQuantity(item.qty_sent)} {unitLabel(item)}</span>
                <input
                  type="number"
                  min={0}
                  max={item.qty_sent}
                  step="any"
                  className="h-10 rounded-lg border border-input px-3 text-sm"
                  value={receivedQty[item.id] ?? "0"}
                  onChange={(e) => setReceivedQty((current) => ({ ...current, [item.id]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              runAction(() =>
                receiveTransfer({
                  transfer_id: detail.transfer.id,
                  items: detail.items.map((item) => ({
                    id: item.id,
                    qty_received: Number(receivedQty[item.id] ?? "0"),
                  })),
                })
              )
            }
          >
            ยืนยันรับสินค้า
          </Button>
        </section>
      ) : null}
    </div>
  )
}
