import Link from "next/link"
import { AlertTriangle, ClipboardList, PackageCheck, ShieldAlert } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
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
import { canManageInventory } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
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

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof AlertTriangle
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

export default async function PortalDamagePage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  const employee = await getCurrentEmployee()
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

  const pendingCount = damages.filter((row) => row.status === "pending").length
  const approvedCount = damages.filter((row) => row.status === "approved").length
  const rejectedCount = damages.filter((row) => row.status === "rejected").length

  return (
    <AdminPageShell
      title="รายงานความเสียหาย"
      description="คิวของเสีย สูญหาย และหมดอายุบนมือถือ พร้อมสถานะอนุมัติจากจุดเดียว"
      action={
        <Link href="/portal/damage/create" className={cn(buttonVariants({ size: "sm" }))}>
          + แจ้งความเสียหาย
        </Link>
      }
    >
      <PortalInventoryTaskNav
        current="damage"
        showManagerLinks={employee ? canManageInventory(employee) : false}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="รายงานทั้งหมด"
          value={damages.length}
          hint="รวมรายการเสียหาย สูญหาย หมดอายุ และ adjustment"
        />
        <SummaryCard
          icon={ShieldAlert}
          label="รออนุมัติ"
          value={pendingCount}
          hint="รายการที่ยังต้องมีคนตัดสินก่อนตัดสต็อกจริง"
        />
        <SummaryCard
          icon={PackageCheck}
          label="อนุมัติแล้ว"
          value={approvedCount}
          hint="รายการที่ระบบตัดสต็อกและบันทึกการเคลื่อนไหวแล้ว"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="ถูกปฏิเสธ"
          value={rejectedCount}
          hint="รายการที่ยังควรย้อนดูเหตุผลหรือแก้ข้อมูลก่อนส่งใหม่"
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
        <Link href="/portal/damage" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ล้าง
        </Link>
      </form>

      {loadError ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">คิวรายการเสียหายและสูญหาย</h2>
            <p className="text-xs text-muted-foreground">
              ใช้ดูรายการที่รออนุมัติ พร้อมแยกสาขา คลัง ประเภท และมูลค่าความเสียหาย
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            รออนุมัติ {pendingCount.toLocaleString("th-TH")} · อนุมัติแล้ว {approvedCount.toLocaleString("th-TH")}
          </div>
        </div>
        <DamageListTable damages={damages} detailBasePath="/portal/damage" />
      </section>
    </AdminPageShell>
  )
}
