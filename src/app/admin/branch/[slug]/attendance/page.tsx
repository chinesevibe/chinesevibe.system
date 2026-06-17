import { notFound, redirect } from "next/navigation"

import { getBranchBySlug } from "@/features/branches/branch-hub-data"
import { requireRole } from "@/lib/auth/require-role"

/** Legacy branch attendance URL → main attendance list filtered by branch. */
export default async function HrBranchAttendancePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await requireRole("hr", "ceo", "dev")
  const { slug } = await params
  const branch = await getBranchBySlug(slug)
  if (!branch) notFound()

  redirect(`/admin/attendance?branch_id=${encodeURIComponent(branch.id)}`)
}
