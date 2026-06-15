import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarCheck } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import {
  getBranchBySlug,
  getBranchLeaveQueue,
} from "@/features/branches/branch-hub-data"
import { ApprovalQueue } from "@/features/manager/ApprovalQueue"
import { mapLeaveQueueItems } from "@/features/manager/map-queue-items"
import { branchAdminPath } from "@/lib/branches/branch-slug"
import { requireRole } from "@/lib/auth/require-role"

export default async function HrBranchLeavesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await requireRole("hr", "ceo", "dev")
  const { slug } = await params
  const branch = await getBranchBySlug(slug)
  if (!branch) notFound()

  const leaves = await getBranchLeaveQueue(branch.id)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <p className="shrink-0 text-sm">
        <Link href={branchAdminPath(branch)} className="text-brand-red hover:underline">
          ← กลับ {branch.name}
        </Link>
      </p>
      <AdminPageShell
        fill
        title="Leave Management"
        description={`คำขอลารออนุมัติ — สาขา ${branch.name}`}
      >
        <ApprovalQueue
          title={`รออนุมัติ (${leaves.length})`}
          emptyText="ไม่มีคำขอลารออนุมัติ"
          emptyIcon={CalendarCheck}
          items={mapLeaveQueueItems(leaves)}
        />
      </AdminPageShell>
    </div>
  )
}
