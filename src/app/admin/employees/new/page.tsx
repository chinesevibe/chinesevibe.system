import Link from "next/link"

import { AddEmployeeForm } from "@/features/employees/AddEmployeeForm"
import { listBranches } from "@/features/branches/data"
import { getOrganizationMasterData } from "@/features/organization/master-data"

export default async function NewEmployeePage() {
  const [organization, branches] = await Promise.all([
    getOrganizationMasterData(),
    listBranches({ forForms: true }),
  ])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <p className="shrink-0 text-sm">
        <Link href="/admin/employees" className="text-brand-red hover:underline">
          ← กลับรายชื่อพนักงาน
        </Link>
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <AddEmployeeForm
          departments={organization.departments}
          positions={organization.positions}
          branches={branches}
        />
      </div>
    </div>
  )
}
