import { notFound } from "next/navigation"

import { getTransferDetail } from "@/features/inventory/actions/transfer"
import { TransferDetailView } from "@/features/inventory/TransferDetailView"
import { requireRole } from "@/lib/auth/require-role"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LiffInventoryTransferReceivePage({ params }: PageProps) {
  await requireRole("employee", "branch_manager", "hr", "inventory", "dev")
  const { id } = await params
  const detail = await getTransferDetail(id)
  if (!detail) notFound()
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-background p-4">
      <div>
        <h1 className="text-lg font-semibold">รับสินค้าโอนเข้า</h1>
        <p className="text-sm text-muted-foreground">{detail.transfer.from_branch_name} → {detail.transfer.to_branch_name}</p>
      </div>
      <TransferDetailView detail={detail} canManage />
    </main>
  )
}
