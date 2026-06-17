import Link from "next/link"
import { redirect } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { listHrBranchesForMapping } from "@/features/inventory/actions/branch"
import { BranchForm } from "@/features/inventory/BranchForm"
import { canManageHr } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"

export default async function NewBranchPage() {
  const employee = await requireInventoryMasterData()
  if (!canManageHr(employee.role)) {
    redirect("/admin/inventory/branches")
  }

  const hrBranches = await listHrBranchesForMapping()

  return (
    <AdminPageShell
      title="สร้างสาขา (คลัง)"
      description={
        <Link href="/admin/inventory/branches" className="text-brand-red hover:underline">
          ← กลับรายการสาขา
        </Link>
      }
    >
      <BranchForm mode="create" hrBranches={hrBranches} />
    </AdminPageShell>
  )
}
