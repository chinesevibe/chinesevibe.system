"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { StatusPill } from "@/components/brand/StatusPill"
import { Button } from "@/components/ui/button"
import {
  approveDamage,
  rejectDamage,
} from "@/features/inventory/actions/consumption"
import {
  DAMAGE_APPROVAL_ROLE_LABELS,
  DAMAGE_STATUS_LABELS,
} from "@/features/inventory/DamageListTable"
import type { InvDamageDetail } from "@/features/inventory/types"
import { formatThaiDate } from "@/lib/datetime/thailand"

function statusVariant(status: InvDamageDetail["status"]) {
  if (status === "approved") return "approved" as const
  if (status === "pending") return "pending" as const
  return "neutral" as const
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function unitLabel(detail: InvDamageDetail) {
  if (!detail.unit_name) return ""
  return detail.unit_abbreviation
    ? `${detail.unit_name} (${detail.unit_abbreviation})`
    : detail.unit_name
}

export function DamageDetailView({
  detail,
  canApprove,
  canReject,
}: {
  detail: InvDamageDetail
  canApprove: boolean
  canReject: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

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
          label={DAMAGE_STATUS_LABELS[detail.status]}
          variant={statusVariant(detail.status)}
        />
        <span className="text-sm text-muted-foreground">
          สร้าง {formatThaiDate(detail.created_at)}
          {detail.approved_at
            ? ` · อนุมัติ ${formatThaiDate(detail.approved_at)}`
            : ""}
          {detail.rejected_at
            ? ` · ปฏิเสธ ${formatThaiDate(detail.rejected_at)}`
            : ""}
        </span>
      </div>

      <div className="grid gap-2 rounded-xl border border-border p-4 text-sm md:grid-cols-2">
        <p>
          <span className="font-medium">ผู้แจ้ง:</span>{" "}
          {detail.created_by_name}
        </p>
        <p>
          <span className="font-medium">ผู้อนุมัติ/ปฏิเสธ:</span>{" "}
          {detail.approver_name ?? "—"}
        </p>
        <p>
          <span className="font-medium">สาขา:</span> {detail.branch_name}
        </p>
        <p>
          <span className="font-medium">คลัง:</span> {detail.warehouse_name}
        </p>
        <p>
          <span className="font-medium">SKU:</span> {detail.sku_code} —{" "}
          {detail.sku_name}
        </p>
        <p>
          <span className="font-medium">จำนวน:</span>{" "}
          {formatQuantity(detail.qty)} {unitLabel(detail)}
        </p>
        <p>
          <span className="font-medium">ประเภท:</span> {detail.damage_type}
        </p>
        <p>
          <span className="font-medium">มูลค่า:</span>{" "}
          {formatMoney(detail.cost_value)} บาท
        </p>
        <p>
          <span className="font-medium">ระดับอนุมัติ:</span>{" "}
          {DAMAGE_APPROVAL_ROLE_LABELS[detail.approval_required_role]}
        </p>
        <p>
          <span className="font-medium">Auto-approved:</span>{" "}
          {detail.auto_approved ? "ใช่" : "ไม่ใช่"}
        </p>
        <p className="md:col-span-2">
          <span className="font-medium">เหตุผล:</span> {detail.reason}
        </p>
        {detail.notes ? (
          <p className="md:col-span-2">
            <span className="font-medium">หมายเหตุ:</span> {detail.notes}
          </p>
        ) : null}
        {detail.rejection_reason ? (
          <p className="md:col-span-2 text-destructive">
            <span className="font-medium">เหตุผล Reject:</span>{" "}
            {detail.rejection_reason}
          </p>
        ) : null}
      </div>

      {detail.photo_signed_url ? (
        <div className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-semibold">รูปแนบ</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detail.photo_signed_url}
            alt="Damage evidence"
            className="mt-3 max-h-96 rounded-lg border border-border object-contain"
          />
        </div>
      ) : (
        <p className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          ไม่มีรูปแนบ
        </p>
      )}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {detail.status === "pending" && (canApprove || canReject) ? (
        <section className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h2 className="text-sm font-semibold">ตัดสินรายงาน</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              อนุมัติแล้วระบบจะตัดสต็อกและบันทึก movement ทันที
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canApprove ? (
              <Button
                type="button"
                disabled={pending}
                onClick={() =>
                  runAction(() => approveDamage({ id: detail.id }))
                }
              >
                อนุมัติ
              </Button>
            ) : null}
          </div>
          {canReject ? (
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
                    rejectDamage({ id: detail.id, reason: rejectReason })
                  )
                }
              >
                Reject
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
