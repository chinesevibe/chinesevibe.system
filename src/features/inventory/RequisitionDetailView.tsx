"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

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
import { getFefoAllocations } from "@/features/inventory/actions/fefo"
import {
  approveRequisition,
  issueRequisition,
  receiveRequisition,
  rejectRequisition,
  submitRequisition,
} from "@/features/inventory/actions/requisition"
import {
  REQUISITION_STATUS_LABELS,
} from "@/features/inventory/RequisitionListTable"
import type { InvFefoAllocation, InvRequisitionDetail, InvRequisitionItemRow } from "@/features/inventory/types"
import { formatThaiDate } from "@/lib/datetime/thailand"

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

function unitLabel(item: InvRequisitionItemRow) {
  if (!item.unit_name) return ""
  return item.unit_abbreviation
    ? `${item.unit_name} (${item.unit_abbreviation})`
    : item.unit_name
}

function statusVariant(status: InvRequisitionDetail["requisition"]["status"]) {
  if (status === "completed") return "approved" as const
  if (status === "pending" || status === "approved" || status === "issued") {
    return "pending" as const
  }
  return "neutral" as const
}

export function RequisitionDetailView({
  detail,
  canManage,
  canSubmit,
  canReceive,
}: {
  detail: InvRequisitionDetail
  canManage: boolean
  canSubmit: boolean
  canReceive: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [approvedQty, setApprovedQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      detail.items.map((item) => [item.id, String(item.qty_requested)])
    )
  )
  const [issuedQty, setIssuedQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      detail.items
        .filter((item) => item.qty_approved > 0)
        .map((item) => [item.id, String(item.qty_approved)])
    )
  )
  const [lotNumbers, setLotNumbers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      detail.items
        .filter((item) => item.qty_approved > 0)
        .map((item) => [item.id, item.lot_number ?? ""])
    )
  )
  const [receivedQty, setReceivedQty] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      detail.items
        .filter((item) => item.qty_issued > 0)
        .map((item) => [item.id, String(item.qty_issued)])
    )
  )

  const [fefoPreview, setFefoPreview] = useState<Record<string, InvFefoAllocation[]>>({})
  const [fefoLoadingId, setFefoLoadingId] = useState<string | null>(null)

  async function loadFefoPreview(item: InvRequisitionItemRow) {
    const qty = Number(issuedQty[item.id] ?? 0)
    if (qty <= 0) return
    setFefoLoadingId(item.id)
    const result = await getFefoAllocations(
      item.sku_id,
      detail.requisition.warehouse_id,
      qty
    )
    setFefoLoadingId(null)
    if (result.success) {
      setFefoPreview((current) => ({ ...current, [item.id]: result.allocations }))
    } else {
      setError(result.error)
    }
  }

  const approvedItems = useMemo(
    () => detail.items.filter((item) => item.qty_approved > 0),
    [detail.items]
  )
  const issuedItems = useMemo(
    () => detail.items.filter((item) => item.qty_issued > 0),
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
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill
          label={REQUISITION_STATUS_LABELS[detail.requisition.status]}
          variant={statusVariant(detail.requisition.status)}
        />
        <span className="text-sm text-muted-foreground">
          สร้าง {formatThaiDate(detail.requisition.created_at)}
          {detail.requisition.approved_at
            ? ` · อนุมัติ ${formatThaiDate(detail.requisition.approved_at)}`
            : ""}
          {detail.requisition.issued_at
            ? ` · จ่าย ${formatThaiDate(detail.requisition.issued_at)}`
            : ""}
          {detail.requisition.received_at
            ? ` · รับ ${formatThaiDate(detail.requisition.received_at)}`
            : ""}
        </span>
      </div>

      <div className="grid gap-2 rounded-xl border border-border p-4 text-sm md:grid-cols-2">
        <p>
          <span className="font-medium">ผู้ขอ:</span> {detail.requester_name}
        </p>
        <p>
          <span className="font-medium">สาขา:</span> {detail.branch_name}
        </p>
        <p>
          <span className="font-medium">คลัง:</span> {detail.warehouse_name}
        </p>
        {detail.requisition.notes ? (
          <p className="md:col-span-2">
            <span className="font-medium">หมายเหตุ:</span>{" "}
            {detail.requisition.notes}
          </p>
        ) : null}
        {detail.requisition.rejection_reason ? (
          <p className="md:col-span-2 text-destructive">
            <span className="font-medium">เหตุผล Reject:</span>{" "}
            {detail.requisition.rejection_reason}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>ขอ</TableHead>
              <TableHead>อนุมัติ</TableHead>
              <TableHead>จ่าย</TableHead>
              <TableHead>รับ</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>ต่าง</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.items.map((item) => {
              const variance = item.qty_issued - item.qty_received
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku_code}</TableCell>
                  <TableCell>{item.sku_name}</TableCell>
                  <TableCell>
                    {formatQuantity(item.qty_requested)} {unitLabel(item)}
                  </TableCell>
                  <TableCell>{formatQuantity(item.qty_approved)}</TableCell>
                  <TableCell>{formatQuantity(item.qty_issued)}</TableCell>
                  <TableCell>{formatQuantity(item.qty_received)}</TableCell>
                  <TableCell>{item.lot_number || "—"}</TableCell>
                  <TableCell>
                    {variance > 0 ? formatQuantity(variance) : "—"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {detail.requisition.status === "draft" && canSubmit ? (
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">ส่งใบเบิก</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ส่งให้คลังตรวจอนุมัติ รายการจะยังไม่ตัดสต็อก
          </p>
          <Button
            type="button"
            className="mt-3"
            disabled={pending}
            onClick={() =>
              runAction(() => submitRequisition(detail.requisition.id))
            }
          >
            ส่งใบเบิก
          </Button>
        </section>
      ) : null}

      {detail.requisition.status === "pending" && canManage ? (
        <section className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">อนุมัติรายการ</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ใส่ 0 เพื่อไม่อนุมัติบางรายการ ถ้าไม่อนุมัติทั้งหมดให้ใช้ Reject
            </p>
          </div>
          <div className="grid gap-3">
            {detail.items.map((item) => (
              <label
                key={item.id}
                className="grid gap-1 text-sm md:grid-cols-[1fr_180px]"
              >
                <span>
                  {item.sku_code} — ขอ {formatQuantity(item.qty_requested)}{" "}
                  {unitLabel(item)}
                </span>
                <input
                  type="number"
                  min={0}
                  max={item.qty_requested}
                  step="any"
                  className="h-10 rounded-lg border border-input px-3 text-sm"
                  value={approvedQty[item.id] ?? "0"}
                  onChange={(event) =>
                    setApprovedQty((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() =>
                runAction(() =>
                  approveRequisition({
                    id: detail.requisition.id,
                    items: detail.items.map((item) => ({
                      id: item.id,
                      qty_approved: Number(approvedQty[item.id] ?? 0),
                    })),
                  })
                )
              }
            >
              อนุมัติ
            </Button>
          </div>
          <div className="grid gap-2 border-t border-border pt-4">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">เหตุผล Reject</span>
              <textarea
                rows={3}
                className="rounded-lg border border-input px-3 py-2 text-sm"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              className="w-fit text-destructive"
              disabled={pending}
              onClick={() =>
                runAction(() =>
                  rejectRequisition({
                    id: detail.requisition.id,
                    reason: rejectReason,
                  })
                )
              }
            >
              Reject ใบเบิก
            </Button>
          </div>
        </section>
      ) : null}

      {detail.requisition.status === "approved" && canManage ? (
        <section className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">จ่ายสินค้า</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ระบบจัด Lot อัตโนมัติตาม FEFO (หมดอายุก่อน) — ไม่ต้องกรอก Lot ยกเว้น SKU ตั้งค่า manual
            </p>
          </div>
          {approvedItems.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-lg border border-border p-3"
            >
              <p className="text-sm">
                {item.sku_code} — อนุมัติ {formatQuantity(item.qty_approved)}{" "}
                {unitLabel(item)}
              </p>
              <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                <input
                  type="number"
                  min={0.001}
                  max={item.qty_approved}
                  step="any"
                  className="h-10 rounded-lg border border-input px-3 text-sm"
                  value={issuedQty[item.id] ?? "0"}
                  onChange={(event) =>
                    setIssuedQty((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Lot (manual SKU เท่านั้น)"
                  className="h-10 rounded-lg border border-input px-3 text-sm"
                  value={lotNumbers[item.id] ?? ""}
                  onChange={(event) =>
                    setLotNumbers((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || fefoLoadingId === item.id}
                  onClick={() => void loadFefoPreview(item)}
                >
                  {fefoLoadingId === item.id ? "กำลังคำนวณ…" : "ดูแนะนำ FEFO"}
                </Button>
              </div>
              {(fefoPreview[item.id]?.length ?? 0) > 0 ? (
                <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">แนะนำ FEFO:</p>
                  <ul className="mt-1 space-y-1">
                    {fefoPreview[item.id]?.map((line) => (
                      <li key={line.lot_id}>
                        {line.lot_number} · หมดอายุ {line.expiry_date ?? "—"} · จำนวน{" "}
                        {formatQuantity(line.qty)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            disabled={pending || approvedItems.length === 0}
            onClick={() =>
              runAction(() =>
                issueRequisition({
                  id: detail.requisition.id,
                  items: approvedItems.map((item) => ({
                    id: item.id,
                    qty_issued: Number(issuedQty[item.id] ?? 0),
                    lot_number: lotNumbers[item.id]?.trim() || undefined,
                    override_reason: undefined,
                  })),
                })
              )
            }
          >
            จ่ายสินค้าและตัดสต็อก
          </Button>
        </section>
      ) : null}

      {detail.requisition.status === "issued" && canReceive ? (
        <section className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">ยืนยันรับสินค้า</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              รับน้อยกว่าจำนวนจ่ายได้ ระบบจะแสดงส่วนต่างในรายละเอียด
            </p>
          </div>
          {issuedItems.map((item) => (
            <label
              key={item.id}
              className="grid gap-1 text-sm md:grid-cols-[1fr_180px]"
            >
              <span>
                {item.sku_code} — จ่าย {formatQuantity(item.qty_issued)}{" "}
                {unitLabel(item)}
              </span>
              <input
                type="number"
                min={0}
                max={item.qty_issued}
                step="any"
                className="h-10 rounded-lg border border-input px-3 text-sm"
                value={receivedQty[item.id] ?? "0"}
                onChange={(event) =>
                  setReceivedQty((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
          <Button
            type="button"
            disabled={pending || issuedItems.length === 0}
            onClick={() =>
              runAction(() =>
                receiveRequisition({
                  id: detail.requisition.id,
                  items: issuedItems.map((item) => ({
                    id: item.id,
                    qty_received: Number(receivedQty[item.id] ?? 0),
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
