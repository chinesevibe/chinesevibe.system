import Link from "next/link"
import { ClipboardList, PackageCheck, Send, Store } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import {
  getInvRequisitionCreateOptions,
  listInvRequisitions,
} from "@/features/inventory/actions/requisition"
import {
  RequisitionListTable,
  REQUISITION_STATUS_LABELS,
} from "@/features/inventory/RequisitionListTable"
import type { InvRequisitionStatus } from "@/features/inventory/types"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS: InvRequisitionStatus[] = [
  "draft",
  "pending",
  "approved",
  "issued",
  "completed",
  "rejected",
]

type PageProps = {
  searchParams: Promise<{ status?: string; branch_id?: string }>
}

function parseStatus(status?: string): InvRequisitionStatus | undefined {
  return STATUS_OPTIONS.includes(status as InvRequisitionStatus)
    ? (status as InvRequisitionStatus)
    : undefined
}

function requisitionHref(filters: {
  status?: InvRequisitionStatus
  branchId?: string
}) {
  const query = new URLSearchParams()
  if (filters.status) query.set("status", filters.status)
  if (filters.branchId) query.set("branch_id", filters.branchId)
  const value = query.toString()
  return value ? `/portal/requisition?${value}` : "/portal/requisition"
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ClipboardList
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString("th-TH")}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-brand-red">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

export default async function PortalRequisitionPage({ searchParams }: PageProps) {
  await requireManagedInventoryPortal()
  const params = await searchParams
  const status = parseStatus(params.status)
  const branchId = params.branch_id?.trim() || undefined

  let loadError: string | null = null
  let requisitions: Awaited<ReturnType<typeof listInvRequisitions>> = []
  let options: Awaited<ReturnType<typeof getInvRequisitionCreateOptions>> = {
    branches: [],
    warehouses: [],
    skus: [],
  }

  try {
    ;[requisitions, options] = await Promise.all([
      listInvRequisitions({ status, branch_id: branchId }),
      getInvRequisitionCreateOptions(),
    ])
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดใบเบิกไม่สำเร็จ"
  }

  const draftCount = requisitions.filter((item) => item.status === "draft").length
  const pendingCount = requisitions.filter((item) => item.status === "pending").length
  const approvedCount = requisitions.filter((item) => item.status === "approved").length
  const issuedCount = requisitions.filter((item) => item.status === "issued").length
  const completedCount = requisitions.filter((item) => item.status === "completed").length
  const selectedBranchName = branchId
    ? options.branches.find((branch) => branch.id === branchId)?.name ?? null
    : null

  return (
    <AdminPageShell
      title="ใบเบิกครัว"
      description="คิวใบเบิกบนมือถือ ดูรออนุมัติ รอจ่าย และรอยืนยันรับจากจุดเดียว"
      action={
        <Link href="/portal/requisition/create" className={cn(buttonVariants({ size: "sm" }))}>
          + สร้างใบเบิก
        </Link>
      }
    >
      <PortalInventoryTaskNav current="requisition" showManagerLinks />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="ใบเบิกทั้งหมด"
          value={requisitions.length}
          hint="รวมคำขอเบิกในหน้างานนี้"
        />
        <SummaryCard
          icon={Send}
          label="รออนุมัติ"
          value={pendingCount}
          hint="คำขอจากครัวที่รอทีมคลังตรวจอนุมัติ"
        />
        <SummaryCard
          icon={Store}
          label="รอจ่ายของ"
          value={approvedCount}
          hint="ใบที่อนุมัติแล้ว เหลือจัดของและตัดสต็อก"
        />
        <SummaryCard
          icon={PackageCheck}
          label="รอยืนยันรับ"
          value={issuedCount}
          hint={`รับครบแล้ว ${completedCount.toLocaleString("th-TH")} · แบบร่าง ${draftCount.toLocaleString("th-TH")}`}
        />
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border/80 bg-muted/20 p-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">สถานะ</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">ทั้งหมด</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {REQUISITION_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">สาขา</span>
          <select
            name="branch_id"
            defaultValue={branchId ?? ""}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">ทุกสาขา</option>
            {options.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.code} — {branch.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
          กรอง
        </button>
        <Link href="/portal/requisition" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ล้าง
        </Link>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={requisitionHref({ branchId })}
          className={cn(buttonVariants({ size: "sm", variant: !status ? "default" : "outline" }))}
        >
          ทั้งหมด
        </Link>
        <Link
          href={requisitionHref({ status: "pending", branchId })}
          className={cn(buttonVariants({ size: "sm", variant: status === "pending" ? "default" : "outline" }))}
        >
          รออนุมัติ {pendingCount}
        </Link>
        <Link
          href={requisitionHref({ status: "approved", branchId })}
          className={cn(buttonVariants({ size: "sm", variant: status === "approved" ? "default" : "outline" }))}
        >
          รอจ่าย {approvedCount}
        </Link>
        <Link
          href={requisitionHref({ status: "issued", branchId })}
          className={cn(buttonVariants({ size: "sm", variant: status === "issued" ? "default" : "outline" }))}
        >
          รอรับ {issuedCount}
        </Link>
      </div>

      {(status || branchId) && !loadError ? (
        <div className="mb-4 rounded-xl border border-border/70 bg-muted/15 p-3 text-sm text-muted-foreground">
          {status ? `สถานะ ${REQUISITION_STATUS_LABELS[status]}` : "ทุกสถานะ"}
          {selectedBranchName ? ` · สาขา ${selectedBranchName}` : ""}
          {` · ${requisitions.length.toLocaleString("th-TH")} ใบ`}
        </div>
      ) : null}

      {loadError ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">คิวใบเบิกครัว</h2>
            <p className="text-xs text-muted-foreground">
              เปิดคิวที่ค้างก่อน แล้วค่อยเข้าไปอนุมัติ จ่ายของ หรือยืนยันรับในรายละเอียดแต่ละใบ
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            รออนุมัติ {pendingCount.toLocaleString("th-TH")} · รอจ่าย {approvedCount.toLocaleString("th-TH")} · รอรับ {issuedCount.toLocaleString("th-TH")}
          </div>
        </div>
        <RequisitionListTable requisitions={requisitions} detailBasePath="/portal/requisition" />
      </section>
    </AdminPageShell>
  )
}
