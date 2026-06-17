import { notFound, redirect } from "next/navigation"

import { getBranchById } from "@/features/branches/branch-hub-data"

export default async function LegacyBranchAttendanceRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const branch = await getBranchById(id)
  if (!branch) notFound()
  redirect(`/admin/attendance?branch_id=${encodeURIComponent(branch.id)}`)
}
