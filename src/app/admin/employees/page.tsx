import Link from "next/link"
import { CircleAlert, Search, UserPlus } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
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
import { listWorkShifts } from "@/features/shifts/data"
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
  const canToggleNightShift = employee ? isDev(employee.role) : false
  const [{ employees, total }, departments, branches, onboardingPending, workShifts] =
    await Promise.all([
      getEmployees(params),
      getDepartments(),
      getBranchesForFilter(),
      getOnboardingPendingCount(),
      listWorkShifts(),
    ])

  const nightShiftId = canToggleNightShift
    ? (workShifts.find((s) => s.code === "BRANCH_NIGHT")?.id ?? null)
    : null
  const quickViews = [
    {
      label: "ทั้งหมด",
      href: "/admin/employees",
      active:
        params.status === "all" &&
        !params.branch_id &&
        !params.dept &&
        !params.q &&
        !params.work_shift_id,
    },
    {
      label: "รออนุมัติ",
      href: "/admin/employees?status=onboarding",
      active: params.status === "onboarding",
    },
    {
      label: "ทดลองงาน",
      href: "/admin/employees?status=probation",
      active: params.status === "probation",
    },
    {
      label: "ยังไม่มีสาขา",
      href: "/admin/employees?branch_id=__none__",
      active: params.branch_id === "__none__",
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <AdminPageShell
        fill
        title="รายชื่อพนักงาน"
        action={
          readOnly ? null : (
            <Link
              href="/admin/employees/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-brand-red text-white hover:bg-brand-red/90"
              )}
            >
              <UserPlus className="size-3.5" />
              เพิ่มพนักงาน
            </Link>
          )
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-hidden">
          {/* Quick views + stats strip */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {quickViews.map((view) => (
                <Link
                  key={view.label}
                  href={view.href}
                  className={cn(
                    "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                    view.active
                      ? "border-brand-red/20 bg-brand-red text-white hover:bg-brand-red/90"
                      : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {view.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Search className="size-3.5" />
                <span className="font-semibold tabular-nums text-foreground">{total}</span> รายการ
              </span>
              {onboardingPending > 0 ? (
                <Link
                  href="/admin/employees?status=onboarding"
                  className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-200"
                >
                  <CircleAlert className="size-3.5" />
                  รออนุมัติ {onboardingPending}
                </Link>
              ) : null}
            </div>
          </div>
          <EmployeeFilters departments={departments} branches={branches} workShifts={workShifts} />
          <div className="min-h-0 flex-1 overflow-hidden">
            <EmployeeTable employees={employees} scrollable returnTo={currentPath} nightShiftId={nightShiftId} />
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
