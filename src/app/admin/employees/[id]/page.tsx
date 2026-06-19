import Link from "next/link"
import { notFound } from "next/navigation"

import { EmployeeProfilePageClient } from "@/features/employees/profile/EmployeeProfilePageClient"
import { getComplianceNotes, getEmployeeProfile } from "@/features/employees/profile/data"
import { listBranches } from "@/features/branches/data"
import { getOrganizationMasterData } from "@/features/organization/master-data"
import { listWorkShifts } from "@/features/shifts/data"
import { canEditEmployeeRecord, canViewSalaryData } from "@/lib/auth/roles"
import { sanitizeReturnTo } from "@/lib/navigation/return-to"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function EmployeeProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params
  const rawSearchParams = await searchParams
  const caller = await getCurrentEmployee()
  const readOnly = caller ? !canEditEmployeeRecord(caller.role) : true
  const canViewSalary = caller ? canViewSalaryData(caller.role) : false
  const returnTo = sanitizeReturnTo(
    typeof rawSearchParams.returnTo === "string" ? rawSearchParams.returnTo : null
  )
  const backHref = returnTo ?? "/admin/employees"
  const backLabel = returnTo ? "← กลับหน้าก่อนหน้า" : "← กลับรายชื่อพนักงาน"
  const profileParams = new URLSearchParams()
  if (returnTo) profileParams.set("returnTo", returnTo)
  const profileHref = profileParams.toString()
    ? `/admin/employees/${id}?${profileParams.toString()}`
    : `/admin/employees/${id}`
  const attendanceParams = new URLSearchParams({ returnTo: profileHref })
  const attendanceHref = `/admin/employees/${id}/attendance?${attendanceParams.toString()}`

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
        <Link href={backHref} className="text-brand-red hover:underline">
          {backLabel}
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
        attendanceHref={attendanceHref}
      />
    </div>
  )
}
