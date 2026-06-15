import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import {
  getDamageCreateOptions,
  listDamageReports,
} from "@/features/inventory/actions/consumption"
import {
  DamageListTable,
  DAMAGE_STATUS_LABELS,
} from "@/features/inventory/DamageListTable"
import type { InvDamageStatus } from "@/features/inventory/types"
import { requireRole } from "@/lib/auth/require-role"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS: InvDamageStatus[] = ["pending", "approved", "rejected"]

type PageProps = {
  searchParams: Promise<{ status?: string; branch_id?: string }>
}

function parseStatus(status?: string): InvDamageStatus | undefined {
  return STATUS_OPTIONS.includes(status as InvDamageStatus)
    ? (status as InvDamageStatus)
    : undefined
}

export default async function InventoryDamagePage({ searchParams }: PageProps) {
  await requireRole("employee", "branch_manager", "hr", "inventory", "ceo", "dev")
  const params = await searchParams
  const status = parseStatus(params.status)
  const branchId = params.branch_id?.trim() || undefined

  let loadError: string | null = null
  let damages: Awaited<ReturnType<typeof listDamageReports>> = []
  let options: Awaited<ReturnType<typeof getDamageCreateOptions>> = {
    branches: [],
    warehouses: [],
    skus: [],
  }

  try {
    ;[damages, options] = await Promise.all([
      listDamageReports({ status, branch_id: branchId }),
      getDamageCreateOptions(),
    ])
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "โหลดรายงานความเสียหายไม่สำเร็จ"
  }

  return (
    <AdminPageShell
      title="รายงานความเสียหาย"
      description="ติดตามของเสีย สูญหาย หมดอายุ และการปรับปรุงสต็อก พร้อมสถานะอนุมัติ"
      action={
        <Link
          href="/admin/inventory/damage/create"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          + แจ้งความเสียหาย
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
                {DAMAGE_STATUS_LABELS[item]}
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
          href="/admin/inventory/damage"
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

      <DamageListTable damages={damages} />
    </AdminPageShell>
  )
}
