import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { listTransfers } from "@/features/inventory/actions/transfer"
import { InventoryHub } from "@/features/inventory/InventoryHub"
import { InventoryLoadError } from "@/features/inventory/InventorySearchBar"
import { TransferListTable } from "@/features/inventory/TransferListTable"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  searchParams?: Promise<{
    status?: "draft" | "in_transit" | "received" | "cancelled"
    branch_id?: string
  }>
}

export default async function InventoryTransferPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
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

  return (
    <AdminPageShell
      title="โอนสินค้า"
      description="โอนระหว่างสาขา ส่งออกจากต้นทางก่อน แล้วคลังปลายทางค่อยยืนยันรับ"
      action={
        <Link href="/admin/inventory/transfer/create" className={cn(buttonVariants({ size: "sm" }))}>
          + สร้างใบโอน
        </Link>
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}
      <TransferListTable rows={rows} />
      <div className="mt-4">
        <InventoryHub />
      </div>
    </AdminPageShell>
  )
}
