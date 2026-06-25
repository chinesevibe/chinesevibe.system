"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { AlertTriangle, ClipboardList, PackageCheck, ShieldAlert } from "lucide-react"

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

function nextStepCopy(
  status: InvDamageDetail["status"],
  canApprove: boolean,
  canReject: boolean
) {
  if (status === "pending") {
    return {
      title: "ขั้นตอนถัดไป",
      body:
        canApprove || canReject
          ? "ตรวจรูป เหตุผล จำนวน และมูลค่าก่อนตัดสิน อนุมัติแล้วระบบจะตัดสต็อกทันที"
          : "รายการนี้ยังรอผู้มีสิทธิตัดสินก่อน จึงยังไม่ตัดสต็อก",
      tone: "border-amber-200 bg-amber-50/80 text-amber-900",
    }
  }
  if (status === "approved") {
    return {
      title: "รายการนี้ปิดแล้ว",
      body: "ระบบตัดสต็อกและบันทึก movement แล้ว ใช้หน้านี้เพื่อตรวจย้อนหลังหรือเทียบหลักฐาน",
      tone: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    }
  }
  return {
    title: "รายการนี้ถูกปฏิเสธ",
    body: "หากข้อมูลยังไม่ครบหรือผิด ให้กลับไปสร้างรายการใหม่พร้อมเหตุผลหรือหลักฐานที่ชัดกว่าเดิม",
    tone: "border-rose-200 bg-rose-50/80 text-rose-900",
  }
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof AlertTriangle
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
  const nextStep = nextStepCopy(detail.status, canApprove, canReject)

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
          label="สถานะรายงาน"
          value={DAMAGE_STATUS_LABELS[detail.status]}
          hint="ใช้ดูว่าเคสนี้ยังรอตัดสิน หรือระบบตัดรายการแล้ว"
        />
        <SummaryCard
          icon={ShieldAlert}
          label="ระดับอนุมัติ"
          value={DAMAGE_APPROVAL_ROLE_LABELS[detail.approval_required_role]}
          hint="บอกว่ารายการนี้ต้องผ่านใครก่อนตัดสต็อก"
        />
        <SummaryCard
          icon={PackageCheck}
          label="SKU / จำนวน"
          value={`${detail.sku_code} · ${formatQuantity(detail.qty)}`}
          hint={`หน่วย ${unitLabel(detail) || "—"} · มูลค่า ${formatMoney(detail.cost_value)} บาท`}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="ประเภทเหตุการณ์"
          value={detail.damage_type}
          hint={`ต้นทาง ${detail.branch_name} · ${detail.warehouse_name}`}
        />
      </div>

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

      <div className={`rounded-xl border p-4 text-sm ${nextStep.tone}`}>
        <p className="font-semibold">{nextStep.title}</p>
        <p className="mt-1">{nextStep.body}</p>
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
          <span className="font-medium">อนุมัติอัตโนมัติ:</span>{" "}
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
            <span className="font-medium">เหตุผลปฏิเสธ:</span>{" "}
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
            alt="หลักฐานความเสียหาย"
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
              อนุมัติแล้วระบบจะตัดสต็อกและบันทึกการเคลื่อนไหวทันที
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
                <span className="font-medium">เหตุผลปฏิเสธ</span>
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
                ปฏิเสธ
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
