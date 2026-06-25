import Link from "next/link"

import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { getTransferDetail } from "@/features/inventory/actions/transfer"
import { TransferDetailView } from "@/features/inventory/TransferDetailView"
import { buttonVariants } from "@/components/ui/button"
import { requireRole } from "@/lib/auth/require-role"
import { cn } from "@/lib/utils"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LiffInventoryTransferReceivePage({ params }: PageProps) {
  await requireRole("employee", "branch_manager", "hr", "inventory", "dev")
  const { id } = await params
  const detail = await getTransferDetail(id)
  if (!detail) {
    return (
      <LiffPageShell title="รับสินค้าโอนเข้า" backHref="/portal/inventory">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h1 className="text-lg font-semibold">ไม่พบใบโอนสินค้า</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              ใบโอนนี้อาจถูกลบ ไม่มีสิทธิ์เข้าถึง หรือยังไม่มีข้อมูลให้ยืนยันรับ
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
      title="รับสินค้าโอนเข้า"
      subtitle={`${detail.transfer.from_branch_name} → ${detail.transfer.to_branch_name}`}
      backHref="/portal/inventory"
    >
      <div className="flex flex-1 flex-col gap-4 p-4">
        <TransferDetailView detail={detail} canManage />
      </div>
    </LiffPageShell>
  )
}
