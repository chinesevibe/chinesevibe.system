"use client"

import { Pencil } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { EmployeeDangerZone } from "@/features/employees/profile/EmployeeDangerZone"
import { EmployeeProfileForm } from "@/features/employees/profile/EmployeeProfileForm"
import { EmployeeProfileView } from "@/features/employees/profile/EmployeeProfileView"
import { LifecyclePanel } from "@/features/employees/profile/LifecyclePanel"
import { PendingRegistrationApproval } from "@/features/employees/profile/PendingRegistrationApproval"
import type { EmployeeProfile } from "@/features/employees/profile/data"

import type { BranchRow } from "@/features/branches/data"
import type {
  OrgDepartment,
  OrgPosition,
} from "@/features/organization/master-data"
import type { WorkShiftSummary } from "@/features/shifts/types"

type ComplianceNote = {
  id: string
  category: string
  note: string
  created_at: string
  attachment_file_name?: string | null
  attachment_uploaded_at?: string | null
  attachment_url?: string | null
}

export function EmployeeProfilePageClient({
  profile,
  notes,
  branches,
  departments,
  positions,
  workShifts,
  readOnly = false,
  canViewSalary = false,
  attendanceHref,
}: {
  profile: EmployeeProfile
  notes: ComplianceNote[]
  branches: BranchRow[]
  departments: OrgDepartment[]
  positions: OrgPosition[]
  workShifts: WorkShiftSummary[]
  readOnly?: boolean
  canViewSalary?: boolean
  attendanceHref: string
}) {
  const isPendingRegistration =
    profile.status === "inactive" && profile.role === "employee"
  const [editing, setEditing] = useState(
    !readOnly && isPendingRegistration
  )

  if (editing) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <p className="text-sm font-medium">แก้ไขข้อมูลพนักงาน</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(false)}
          >
            กลับหน้าโปรไฟล์
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <EmployeeProfileForm
            profile={profile}
            branches={branches}
            departments={departments}
            positions={positions}
            workShifts={workShifts}
            canViewSalary={canViewSalary}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
      {!readOnly && isPendingRegistration ? (
        <PendingRegistrationApproval employeeId={profile.id} />
      ) : null}
      <EmployeeProfileView
        profile={profile}
        canViewSalary={canViewSalary}
        attendanceHref={attendanceHref}
        actions={
          readOnly ? null : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              Edit Profile
            </Button>
          )
        }
      />
      <section className="shrink-0 rounded-xl border border-border/80 bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">วงจรพนักงาน</h2>
        <LifecyclePanel profile={profile} notes={notes} />
      </section>
      {!readOnly ? <EmployeeDangerZone profile={profile} /> : null}
    </div>
  )
}
