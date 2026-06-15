import { notFound, redirect } from "next/navigation"

import { getBranchById } from "@/features/branches/branch-hub-data"
import { branchAdminPath } from "@/lib/branches/branch-slug"

/** Legacy UUID URL → /admin/branch/<slug> */
export default async function LegacyBranchDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const branch = await getBranchById(id)
  if (!branch) notFound()
  redirect(branchAdminPath(branch))
}
