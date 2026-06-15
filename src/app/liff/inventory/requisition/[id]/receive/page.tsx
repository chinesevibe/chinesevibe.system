import { notFound } from "next/navigation"

import { getInvRequisitionDetail } from "@/features/inventory/actions/requisition"
import { RequisitionDetailView } from "@/features/inventory/RequisitionDetailView"
import { requireRole } from "@/lib/auth/require-role"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LiffInventoryRequisitionReceivePage({ params }: PageProps) {
  await requireRole("employee", "branch_manager", "hr", "inventory", "dev")
  const { id } = await params
  const detail = await getInvRequisitionDetail(id)
  if (!detail) notFound()
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-background p-4">
      <div>
        <h1 className="text-lg font-semibold">ยืนยันรับใบเบิก</h1>
        <p className="text-sm text-muted-foreground">{detail.branch_name} · {detail.warehouse_name}</p>
      </div>
      <RequisitionDetailView detail={detail} canManage={false} canSubmit={false} canReceive />
    </main>
  )
}
