"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { ClipboardList, PackageCheck, Send, Store } from "lucide-react"

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

function nextStepCopy(
  status: InvRequisitionDetail["requisition"]["status"],
  canManage: boolean,
  canSubmit: boolean,
  canReceive: boolean
) {
  if (status === "draft") {
    return {
      title: "ขั้นตอนถัดไป",
      body: canSubmit
        ? "ตรวจรายการและกดส่งใบเบิก เพื่อให้คลังเริ่มอนุมัติได้"
        : "ใบนี้ยังเป็นแบบร่าง ต้องให้ผู้สร้างส่งเข้า workflow ก่อน",
      tone: "border-sky-200 bg-sky-50/70 text-sky-900",
    }
  }
  if (status === "pending") {
    return {
      title: "รออนุมัติ",
      body: canManage
        ? "กำหนดจำนวนที่อนุมัติหรือปฏิเสธทั้งใบ จากนั้นใบจะรอจ่ายสินค้า"
        : "ตอนนี้ใบกำลังรอคลังอนุมัติ ยังไม่มีการตัดสต็อก",
      tone: "border-amber-200 bg-amber-50/80 text-amber-900",
    }
  }
  if (status === "approved") {
    return {
      title: "รอจ่ายสินค้า",
      body: canManage
        ? "ตรวจ FEFO และจำนวนที่จะจ่ายให้ครบ ก่อนยืนยันจ่ายออกจากคลัง"
        : "ใบนี้อนุมัติแล้วและกำลังรอคลังจ่ายสินค้า",
      tone: "border-violet-200 bg-violet-50/80 text-violet-900",
    }
  }
  if (status === "issued") {
    return {
      title: "รอยืนยันรับ",
      body: canReceive
        ? "ปลายทางต้องยืนยันจำนวนที่รับจริง เพื่อปิดใบเบิกนี้ให้ครบ"
        : "คลังจ่ายของแล้ว เหลือรอปลายทางยืนยันรับ",
      tone: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    }
  }
  if (status === "completed") {
    return {
      title: "งานนี้เสร็จแล้ว",
      body: "ตรวจย้อนหลังได้จากรายการด้านล่าง ถ้าตัวเลขไม่ตรงค่อยทำรายการใหม่หรือแก้ตามสิทธิ",
      tone: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    }
  }
  return {
    title: "ใบเบิกถูกปิด",
    body: "ใบนี้ถูกปฏิเสธแล้ว ถ้าจะเดินงานต่อให้กลับไปสร้างหรือส่งใบใหม่",
    tone: "border-rose-200 bg-rose-50/80 text-rose-900",
  }
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ClipboardList
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
  const totalRequested = useMemo(
    () => detail.items.reduce((sum, item) => sum + item.qty_requested, 0),
    [detail.items]
  )
  const totalIssued = useMemo(
    () => detail.items.reduce((sum, item) => sum + item.qty_issued, 0),
    [detail.items]
  )
  const nextStep = nextStepCopy(
    detail.requisition.status,
    canManage,
    canSubmit,
    canReceive
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
          label="สถานะใบเบิก"
          value={REQUISITION_STATUS_LABELS[detail.requisition.status]}
          hint="ไหลจากแบบร่าง → รออนุมัติ → อนุมัติ → จ่าย → รับครบ"
        />
        <SummaryCard
          icon={Send}
          label="ผู้ขอ / สาขา"
          value={`${detail.requester_name} · ${detail.branch_name}`}
          hint="ใช้ยืนยันต้นทางของคำขอจากครัวหรือสาขา"
        />
        <SummaryCard
          icon={Store}
          label="คลัง / ปริมาณขอ"
          value={`${detail.warehouse_name} · ${formatQuantity(totalRequested)}`}
          hint="ปริมาณรวมที่ร้องขอในใบเบิกนี้"
        />
        <SummaryCard
          icon={PackageCheck}
          label="จ่ายแล้ว"
          value={formatQuantity(totalIssued)}
          hint="ช่วยดูเร็วว่าคลังเริ่มจ่ายของไปแล้วมากน้อยแค่ไหน"
        />
      </div>

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

      <div className={`rounded-xl border p-4 text-sm ${nextStep.tone}`}>
        <p className="font-semibold">{nextStep.title}</p>
        <p className="mt-1">{nextStep.body}</p>
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
            <span className="font-medium">เหตุผลการปฏิเสธ:</span>{" "}
            {detail.requisition.rejection_reason}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">รายการเบิกและสถานะต่อรายการ</h2>
            <p className="text-xs text-muted-foreground">
              ใช้ตรวจจำนวนที่ขอ อนุมัติ จ่าย รับ และส่วนต่าง ก่อนทำ action ขั้นถัดไป
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {detail.items.length.toLocaleString("th-TH")} รายการ
          </div>
        </div>
        <div className="grid gap-3 md:hidden">
          {detail.items.map((item) => {
            const variance = item.qty_issued - item.qty_received
            return (
              <div key={item.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.sku_code}</p>
                    <p className="text-sm text-muted-foreground">{item.sku_name}</p>
                  </div>
                  {variance > 0 ? (
                    <StatusPill label={`ค้าง ${formatQuantity(variance)}`} variant="pending" />
                  ) : (
                    <StatusPill label="ครบ" variant="approved" />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">ขอ</p>
                    <p className="text-base font-semibold tabular-nums">
                      {formatQuantity(item.qty_requested)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">อนุมัติ</p>
                    <p className="text-base font-semibold tabular-nums">
                      {formatQuantity(item.qty_approved)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">จ่าย</p>
                    <p className="text-base font-semibold tabular-nums">
                      {formatQuantity(item.qty_issued)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">รับ</p>
                    <p className="text-base font-semibold tabular-nums">
                      {formatQuantity(item.qty_received)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">หน่วย:</span> {unitLabel(item) || "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">ล็อต:</span> {item.lot_number || "—"}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>ขอ</TableHead>
              <TableHead>อนุมัติ</TableHead>
              <TableHead>จ่าย</TableHead>
              <TableHead>รับ</TableHead>
              <TableHead>ล็อต</TableHead>
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
      </section>

      {detail.requisition.status === "draft" && canSubmit ? (
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">ส่งใบเบิก</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ส่งให้คลังตรวจอนุมัติ รายการจะยังไม่ตัดสต็อก
          </p>
          <Button
            type="button"
            className="mt-3 w-full md:w-auto"
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
              ใส่ 0 เพื่อไม่อนุมัติบางรายการ ถ้าไม่อนุมัติทั้งหมดให้ใช้ปุ่มปฏิเสธ
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
              className="w-full sm:w-auto"
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
              <span className="font-medium">เหตุผลการปฏิเสธ</span>
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
              className="w-full sm:w-fit text-destructive"
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
              ปฏิเสธใบเบิก
            </Button>
          </div>
        </section>
      ) : null}

      {detail.requisition.status === "approved" && canManage ? (
        <section className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">จ่ายสินค้า</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ระบบจัดล็อตอัตโนมัติตาม FEFO (หมดอายุก่อน) — ไม่ต้องกรอกล็อต ยกเว้น SKU ที่ตั้งค่าให้กรอกเอง
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
                  placeholder="ล็อต (เฉพาะ SKU ที่ตั้งค่าให้กรอกเอง)"
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
            className="w-full md:w-auto"
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
            <div
              key={item.id}
              className="grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-3 md:grid-cols-[1fr_180px]"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {item.sku_code} — {item.sku_name}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">จ่าย</p>
                    <p className="font-semibold tabular-nums">
                      {formatQuantity(item.qty_issued)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-background p-2">
                    <p className="text-[11px] text-muted-foreground">รับแล้ว</p>
                    <p className="font-semibold tabular-nums">
                      {formatQuantity(item.qty_received)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  หน่วย {unitLabel(item) || "—"} · ล็อต {item.lot_number || "—"}
                </p>
              </div>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">จำนวนที่รับครั้งนี้</span>
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
            </div>
          ))}
          <Button
            type="button"
            className="w-full md:w-auto"
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
