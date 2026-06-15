import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
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
import { requireRole } from "@/lib/auth/require-role"
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

export default async function InventoryRequisitionPage({
  searchParams,
}: PageProps) {
  await requireRole("employee", "branch_manager", "hr", "admin", "ceo", "dev")
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

  return (
    <AdminPageShell
      title="ใบเบิกครัว"
      description="ครัวขอเบิก → คลังอนุมัติ → คลังจ่ายของ → ครัวยืนยันรับ"
      action={
        <Link
          href="/admin/inventory/requisition/create"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          + สร้างใบเบิก
        </Link>
      }
    >
      <form className="mb-4 flex flex-wrap items-end gap-3">
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
        <Link
          href="/admin/inventory/requisition"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          ล้าง
        </Link>
      </form>

      {loadError ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <RequisitionListTable requisitions={requisitions} />
    </AdminPageShell>
  )
}
