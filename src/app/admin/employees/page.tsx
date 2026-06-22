import Link from "next/link"
import { CircleAlert, Search, UserPlus, Users } from "lucide-react"

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
                "bg-brand-red text-white hover:bg-brand-red/90 max-sm:w-full max-sm:justify-center"
              )}
            >
              <UserPlus className="size-4" />
              Add Employee
            </Link>
          )
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_16rem_16rem]">
            <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-background via-background to-muted/10 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                  <Users className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">ศูนย์จัดการพนักงาน</p>
                  <p className="text-sm text-muted-foreground">
                    ค้นหาพนักงาน เปิดโปรไฟล์ และตรวจสถานะการจ้างจากหน้าเดียวก่อนไปยัง workflow อื่น
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ผลลัพธ์</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{total}</p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Search className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">จำนวนรายการตามตัวกรองปัจจุบัน</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">รออนุมัติ</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{onboardingPending}</p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <CircleAlert className="size-4" />
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">พนักงานที่ยังต้องกำหนดสิทธิ์หรือสาขา</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickViews.map((view) => (
              <Link
                key={view.label}
                href={view.href}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  view.active
                    ? "border-brand-red/20 bg-brand-red text-white hover:bg-brand-red/90"
                    : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {view.label}
              </Link>
            ))}
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
