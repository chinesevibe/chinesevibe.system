import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getInvBranch } from "@/features/inventory/actions/branch"
import { BranchForm } from "@/features/inventory/BranchForm"
import { canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditBranchPage({ params }: PageProps) {
  const employee = await requireInventoryMasterData()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const { id } = await params

  const branch = await getInvBranch(id)
  if (!branch) notFound()

  return (
    <AdminPageShell
      title={readOnly ? `ดูสาขา — ${branch.code}` : `แก้ไขสาขา — ${branch.code}`}
      description={
        <Link href="/admin/inventory/branches" className="text-brand-red hover:underline">
          ← กลับรายการสาขา
        </Link>
      }
    >
      <BranchForm
        mode="edit"
        initial={branch}
        readOnly={readOnly || !canManageHr(employee.role)}
      />
    </AdminPageShell>
  )
}
