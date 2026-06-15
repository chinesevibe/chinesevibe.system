import Link from "next/link"
import { notFound } from "next/navigation"
import { Timer } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import {
  getBranchBySlug,
  getBranchOvertimeQueue,
} from "@/features/branches/branch-hub-data"
import { ApprovalQueue } from "@/features/manager/ApprovalQueue"
import { mapOvertimeQueueItems } from "@/features/manager/map-queue-items"
import { branchAdminPath } from "@/lib/branches/branch-slug"
import { requireRole } from "@/lib/auth/require-role"

export default async function HrBranchOvertimePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await requireRole("hr", "admin", "ceo", "dev")
  const { slug } = await params
  const branch = await getBranchBySlug(slug)
  if (!branch) notFound()

  const overtime = await getBranchOvertimeQueue(branch.id)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <p className="shrink-0 text-sm">
        <Link href={branchAdminPath(branch)} className="text-brand-red hover:underline">
          ← กลับ {branch.name}
        </Link>
      </p>
      <AdminPageShell fill title="Approve OT" description={`สาขา ${branch.name}`}>
        <ApprovalQueue
          title={`รออนุมัติ (${overtime.length})`}
          emptyText="ไม่มีคำขอ OT รออนุมัติ"
          emptyIcon={Timer}
          items={mapOvertimeQueueItems(overtime)}
        />
      </AdminPageShell>
    </div>
  )
}
