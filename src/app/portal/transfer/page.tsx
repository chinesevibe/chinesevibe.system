import Link from "next/link"
import { ClipboardList, PackageCheck, Send, Truck } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { listTransfers } from "@/features/inventory/actions/transfer"
import { InventoryLoadError } from "@/features/inventory/InventorySearchBar"
import { TransferListTable } from "@/features/inventory/TransferListTable"
import { requireManagedInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  searchParams?: Promise<{
    status?: "draft" | "in_transit" | "received" | "cancelled"
    branch_id?: string
  }>
}

function transferHref(status?: "draft" | "in_transit" | "received" | "cancelled") {
  if (!status) return "/portal/transfer"
  return `/portal/transfer?status=${status}`
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Truck
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

export default async function PortalTransferPage({ searchParams }: PageProps) {
  await requireManagedInventoryPortal()
  const params = await searchParams
  let rows: Awaited<ReturnType<typeof listTransfers>> = []
  let loadError: string | null = null
  try {
    rows = await listTransfers({
      status: params?.status,
      branch_id: params?.branch_id,
    })
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดใบโอนไม่สำเร็จ"
  }

  const draftCount = rows.filter((row) => row.status === "draft").length
  const inTransitCount = rows.filter((row) => row.status === "in_transit").length
  const receivedCount = rows.filter((row) => row.status === "received").length
  const cancelledCount = rows.filter((row) => row.status === "cancelled").length
  const totalItems = rows.reduce((sum, row) => sum + row.item_count, 0)

  return (
    <AdminPageShell
      title="โอนสินค้า"
      description="คิวใบโอนบนมือถือ ติดตามแบบร่าง กำลังโอน และปลายทางรับครบจากจุดเดียว"
      action={
        <Link href="/portal/transfer/create" className={cn(buttonVariants({ size: "sm" }))}>
          + สร้างใบโอน
        </Link>
      }
    >
      <PortalInventoryTaskNav current="transfer" showManagerLinks />

      {loadError ? <InventoryLoadError message={loadError} /> : null}

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Truck}
          label="ใบโอนทั้งหมด"
          value={rows.length}
          hint="รวมรายการโอนระหว่างสาขาและคลัง"
        />
        <SummaryCard
          icon={ClipboardList}
          label="รอส่งออก"
          value={draftCount}
          hint="ใบโอนที่ยังต้องตรวจรายการหรือเตรียมส่งออกจากต้นทาง"
        />
        <SummaryCard
          icon={Send}
          label="รอปลายทางรับ"
          value={inTransitCount}
          hint="ใบโอนที่หักสต็อกจากต้นทางแล้วและรอปลายทางยืนยันรับ"
        />
        <SummaryCard
          icon={PackageCheck}
          label="รับครบแล้ว"
          value={receivedCount}
          hint={`ยกเลิก ${cancelledCount.toLocaleString("th-TH")} · รวม ${totalItems.toLocaleString("th-TH")} รายการ`}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={transferHref()}
          className={cn(buttonVariants({ size: "sm", variant: !params?.status ? "default" : "outline" }))}
        >
          ทั้งหมด
        </Link>
        <Link
          href={transferHref("draft")}
          className={cn(buttonVariants({ size: "sm", variant: params?.status === "draft" ? "default" : "outline" }))}
        >
          รอส่งออก {draftCount}
        </Link>
        <Link
          href={transferHref("in_transit")}
          className={cn(buttonVariants({ size: "sm", variant: params?.status === "in_transit" ? "default" : "outline" }))}
        >
          รอรับ {inTransitCount}
        </Link>
        <Link
          href={transferHref("received")}
          className={cn(buttonVariants({ size: "sm", variant: params?.status === "received" ? "default" : "outline" }))}
        >
          รับครบ {receivedCount}
        </Link>
      </div>

      {params?.status && !loadError ? (
        <div className="mb-4 rounded-xl border border-border/70 bg-muted/15 p-3 text-sm text-muted-foreground">
          ดูสถานะ {params.status === "draft" ? "รอส่งออก" : params.status === "in_transit" ? "รอปลายทางรับ" : params.status === "received" ? "รับครบแล้ว" : "ยกเลิก"} · {rows.length.toLocaleString("th-TH")} ใบ
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">คิวใบโอนระหว่างสาขา</h2>
            <p className="text-xs text-muted-foreground">
              เปิดคิวที่ค้างก่อน แล้วค่อยเข้าไปส่งออกจากต้นทางหรือยืนยันรับที่ปลายทาง
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            รอส่งออก {draftCount.toLocaleString("th-TH")} · รอรับ {inTransitCount.toLocaleString("th-TH")}
          </div>
        </div>
        <TransferListTable rows={rows} detailBasePath="/portal/transfer" />
      </section>
    </AdminPageShell>
  )
}
