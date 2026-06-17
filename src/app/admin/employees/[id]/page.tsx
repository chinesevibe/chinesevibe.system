import Link from "next/link"
import { notFound } from "next/navigation"

import { EmployeeProfilePageClient } from "@/features/employees/profile/EmployeeProfilePageClient"
import { getComplianceNotes, getEmployeeProfile } from "@/features/employees/profile/data"
import { listBranches } from "@/features/branches/data"
import { getOrganizationMasterData } from "@/features/organization/master-data"
import { listWorkShifts } from "@/features/shifts/data"
import { canEditEmployeeRecord, canViewSalaryData } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const caller = await getCurrentEmployee()
  const readOnly = caller ? !canEditEmployeeRecord(caller.role) : true
  const canViewSalary = caller ? canViewSalaryData(caller.role) : false

  const [profile, notes, branches, organization, workShifts] = await Promise.all([
    getEmployeeProfile(id).catch(() => null),
    getComplianceNotes(id).catch(() => []),
    listBranches({ forForms: true }).catch(() => []),
    getOrganizationMasterData().catch(() => ({
      departments: [],
      positions: [],
    })),
    listWorkShifts().catch(() => []),
  ])
  if (!profile) notFound()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <p className="shrink-0 text-sm">
        <Link href="/admin/employees" className="text-brand-red hover:underline">
          ← กลับรายชื่อพนักงาน
        </Link>
      </p>
      <EmployeeProfilePageClient
        profile={profile}
        notes={notes}
        branches={branches}
        departments={organization.departments}
        positions={organization.positions}
        workShifts={workShifts}
        readOnly={readOnly}
        canViewSalary={canViewSalary}
      />
    </div>
  )
}
