import { notFound, redirect } from "next/navigation"

import { getBranchById } from "@/features/branches/branch-hub-data"
import { branchAdminSubPath } from "@/lib/branches/branch-slug"

export default async function LegacyBranchLeavesRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const branch = await getBranchById(id)
  if (!branch) notFound()
  redirect(branchAdminSubPath(branch, "leaves"))
}
