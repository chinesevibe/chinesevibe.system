import Link from "next/link"
import { UserPlus } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { CountBadge } from "@/components/brand/CountBadge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getBranchesForFilter,
  getDepartments,
  getEmployees,
  getOnboardingPendingCount,
  normalizeParams,
  PAGE_SIZE,
} from "@/features/employees/data"
import { isCeo, isDev } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { EmployeeFilters } from "@/features/employees/EmployeeFilters"
import { EmployeePagination } from "@/features/employees/EmployeePagination"
import { EmployeeTable } from "@/features/employees/EmployeeTable"

export default async function AdminEmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const rawSearchParams = await searchParams
  const [employee, params] = await Promise.all([
    getCurrentEmployee(),
    normalizeParams(rawSearchParams),
  ])
  const currentParams = new URLSearchParams()
  for (const [key, value] of Object.entries(rawSearchParams)) {
    if (typeof value === "string" && value) currentParams.set(key, value)
  }
  const currentPath = currentParams.toString()
    ? `/admin/employees?${currentParams.toString()}`
    : "/admin/employees"
  const readOnly = employee ? isCeo(employee.role) && !isDev(employee.role) : false
  const [{ employees, total }, departments, branches, onboardingPending] =
    await Promise.all([
      getEmployees(params),
      getDepartments(),
      getBranchesForFilter(),
      getOnboardingPendingCount(),
    ])

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AdminPageShell
        fill
        title="รายชื่อพนักงาน"
        description="ค้นหา กรอง และเปิดโปรไฟล์ — เงินเดือนดูที่เมนู Payroll"
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <CountBadge count={total} label="คน" />
            {onboardingPending > 0 ? (
              <Link
                href="/admin/employees?status=onboarding"
                className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200"
              >
                รอกำหนดสิทธิ์ {onboardingPending}
              </Link>
            ) : null}
          </div>
        }
        action={
          readOnly ? null : (
            <Link
              href="/admin/employees/new"
              className={cn(
                buttonVariants({ size: "default" }),
                "bg-brand-red text-white hover:bg-brand-red/90"
              )}
            >
              <UserPlus className="size-4" />
              Add Employee
            </Link>
          )
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <EmployeeFilters departments={departments} branches={branches} />
          <div className="min-h-0 flex-1 overflow-hidden">
            <EmployeeTable employees={employees} scrollable returnTo={currentPath} />
          </div>
          <EmployeePagination
            page={params.page}
            total={total}
            pageSize={PAGE_SIZE}
          />
        </div>
      </AdminPageShell>
    </div>
  )
}
