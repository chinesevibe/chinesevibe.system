import Link from "next/link"

import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { getInvRequisitionDetail } from "@/features/inventory/actions/requisition"
import { RequisitionDetailView } from "@/features/inventory/RequisitionDetailView"
import { buttonVariants } from "@/components/ui/button"
import { requireRole } from "@/lib/auth/require-role"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LiffInventoryRequisitionReceivePage({ params }: PageProps) {
  await requireRole("employee", "branch_manager", "hr", "inventory", "dev")
  const { id } = await params
  const detail = await getInvRequisitionDetail(id)
  if (!detail) {
    return (
      <LiffPageShell title="ยืนยันรับใบเบิก" backHref="/portal/inventory">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h1 className="text-lg font-semibold">ไม่พบใบเบิก</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              ใบเบิกนี้อาจถูกลบ ไม่มีสิทธิ์เข้าถึง หรือยังไม่มีข้อมูลให้ยืนยันรับ
            </p>
            <Link
              href="/portal/inventory"
              className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
            >
              กลับหน้าคลังสินค้า
            </Link>
          </div>
        </div>
      </LiffPageShell>
    )
  }
  return (
    <LiffPageShell
      title="ยืนยันรับใบเบิก"
      subtitle={`${detail.branch_name} · ${detail.warehouse_name}`}
      backHref="/portal/inventory"
    >
      <div className="flex flex-1 flex-col gap-4 p-4">
        <RequisitionDetailView detail={detail} canManage={false} canSubmit={false} canReceive />
      </div>
    </LiffPageShell>
  )
}
