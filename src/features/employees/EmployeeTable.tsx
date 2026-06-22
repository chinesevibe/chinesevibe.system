"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Clock3, FileText, Moon, Phone, UserRound, View } from "lucide-react"
import { useTransition } from "react"

import { DevelopmentEmptyState } from "@/components/brand/DevelopmentEmptyState"
import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { StatusPill } from "@/components/brand/StatusPill"
import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { employeeDisplayStatusPill } from "@/features/employees/employee-list-display"
import type { EmployeeRow } from "@/features/employees/data"
import { LineLinkBadge } from "@/features/employees/LineLinkBadge"
import { appendReturnTo } from "@/lib/navigation/return-to"
import { cn } from "@/lib/utils"

function displayEmployeeCode(e: EmployeeRow): string {
  return e.employee_code?.trim() || e.id.slice(0, 8).toUpperCase()
}

function stopRowNav(event: React.MouseEvent) {
  event.stopPropagation()
}

function EmployeeMobileCard({
  employee: e,
  returnTo,
  nightShiftId,
}: {
  employee: EmployeeRow
  returnTo?: string | null
  nightShiftId?: string | null
}) {
  const profileHref = appendReturnTo(`/admin/employees/${e.id}`, returnTo)
  const attendanceHref = appendReturnTo(`/admin/employees/${e.id}/attendance`, returnTo)
  const statusPill = employeeDisplayStatusPill(e.displayStatus)
  const branchLabel = e.branch_name
    ? e.branch_name
    : e.displayStatus === "onboarding" || e.displayStatus === "pending_approval"
      ? "รอกำหนดสาขา"
      : "—"

  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Link href={profileHref} className="flex min-w-0 items-center gap-3" aria-label={`เปิดโปรไฟล์ ${e.name}`}>
          <EmployeeAvatar name={e.name} imageUrl={e.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{e.name}</p>
            <p className="text-xs font-medium tabular-nums text-muted-foreground">
              {displayEmployeeCode(e)}
            </p>
          </div>
        </Link>
        <StatusPill label={statusPill.label} variant={statusPill.variant} />
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">ตำแหน่ง / แผนก</p>
          <p className="truncate font-medium text-foreground">{e.position ?? e.department ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">เวลาเข้า-ออก</p>
          <p className="whitespace-nowrap font-medium tabular-nums text-foreground">{e.work_time_text}</p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">สาขา</p>
          <p className="truncate font-medium text-foreground">{branchLabel}</p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">ติดต่อ</p>
          <p className="truncate font-medium text-foreground">{e.phone?.trim() ? e.phone : "ไม่มีเบอร์ติดต่อ"}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {e.phone?.trim() ? (
          <a
            href={`tel:${e.phone.replace(/\s/g, "")}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            <Phone className="size-3.5" />
            โทร
          </a>
        ) : null}
        {nightShiftId ? (
          <NightShiftToggle
            employeeId={e.id}
            currentShiftId={e.work_shift_id}
            nightShiftId={nightShiftId}
          />
        ) : null}
        <Link
          href={attendanceHref}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-3")}
        >
          <Clock3 className="size-3.5" />
          เวลาเข้างาน
        </Link>
        <Link
          href={profileHref}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
        >
          <View className="size-3.5" />
          เปิดโปรไฟล์
        </Link>
      </div>
    </div>
  )
}

function NightShiftToggle({
  employeeId,
  currentShiftId,
  nightShiftId,
}: {
  employeeId: string
  currentShiftId: string | null
  nightShiftId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const isNight = currentShiftId === nightShiftId

  function toggle() {
    startTransition(async () => {
      await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_shift_id: isNight ? null : nightShiftId }),
      })
      router.refresh()
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={isNight ? "ถอด BRANCH_NIGHT" : "ตั้งเป็น BRANCH_NIGHT"}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md border transition-colors disabled:opacity-40",
        isNight
          ? "border-indigo-300 bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      <Moon className={cn("size-3.5", isNight && "fill-indigo-600")} />
    </button>
  )
}

function EmployeeTableRow({
  employee: e,
  returnTo,
  nightShiftId,
}: {
  employee: EmployeeRow
  returnTo?: string | null
  nightShiftId?: string | null
}) {
  const router = useRouter()
  const profileHref = appendReturnTo(`/admin/employees/${e.id}`, returnTo)
  const attendanceHref = appendReturnTo(`/admin/employees/${e.id}/attendance`, returnTo)
  const statusPill = employeeDisplayStatusPill(e.displayStatus)
  const departmentPosition = [e.department, e.position].filter(Boolean).join(" • ") || "—"
  const branchLabel = e.branch_name
    ? e.branch_name
    : e.displayStatus === "onboarding" || e.displayStatus === "pending_approval"
      ? "รอกำหนดสาขา"
      : "—"

  return (
    <TableRow
      className="cursor-pointer border-b border-border/50 hover:bg-muted/20"
      onClick={() => router.push(profileHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          router.push(profileHref)
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`เปิดโปรไฟล์ ${e.name}`}
    >
      <TableCell className="min-w-[14rem]">
        <div className="flex min-w-0 items-center gap-2.5">
          <EmployeeAvatar name={e.name} imageUrl={e.avatarUrl} size="sm" />
          <div className="min-w-0">
            <Link
              href={profileHref}
              className="block truncate font-medium text-foreground underline-offset-4 hover:text-brand-red hover:underline"
              onClick={stopRowNav}
            >
              {e.name}
            </Link>
            <p className="truncate text-xs font-medium tabular-nums text-muted-foreground">
              {displayEmployeeCode(e)}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="max-w-[11rem] text-sm">
        <div className="space-y-1">
          <p className="truncate font-medium text-foreground">{departmentPosition}</p>
          <p className="truncate text-xs text-muted-foreground">{branchLabel}</p>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm tabular-nums font-medium">
        {e.work_time_text}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <StatusPill label={statusPill.label} variant={statusPill.variant} />
      </TableCell>
      <TableCell className="max-w-[11rem]" onClick={stopRowNav}>
        <div className="space-y-1.5 text-sm">
          <LineLinkBadge lineUserId={e.line_user_id} />
          {e.phone?.trim() ? (
            <a
              href={`tel:${e.phone.replace(/\s/g, "")}`}
              className="block truncate tabular-nums hover:text-brand-red hover:underline"
              onClick={stopRowNav}
            >
              {e.phone}
            </a>
          ) : (
            <span className="block text-muted-foreground">ไม่มีเบอร์</span>
          )}
          {e.contract_file_path ? (
            <a
              href={`/api/employees/${e.id}/contract`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-red hover:underline"
            >
              <FileText className="size-4 shrink-0" aria-hidden />
              เปิดสัญญา
            </a>
          ) : e.contract_start ? (
            <Link
              href={profileHref}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
              onClick={stopRowNav}
            >
              <FileText className="size-4 shrink-0" aria-hidden />
              แนบสัญญา
            </Link>
          ) : (
            <span className="block text-muted-foreground">ไม่มีสัญญา</span>
          )}
        </div>
      </TableCell>
      {nightShiftId && (
        <TableCell className="whitespace-nowrap" onClick={stopRowNav}>
          <NightShiftToggle
            employeeId={e.id}
            currentShiftId={e.work_shift_id}
            nightShiftId={nightShiftId}
          />
        </TableCell>
      )}
      <TableCell className="whitespace-nowrap" onClick={stopRowNav}>
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={attendanceHref}
            aria-label={`เปิดเวลาเข้างาน ${e.name}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Clock3 className="size-3.5" />
            เวลา
          </Link>
          <Link
            href={profileHref}
            aria-label={`เปิดโปรไฟล์ ${e.name}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <UserRound className="size-3.5" />
            โปรไฟล์
          </Link>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function EmployeeTable({
  employees,
  scrollable = false,
  returnTo,
  nightShiftId,
}: {
  employees: EmployeeRow[]
  scrollable?: boolean
  returnTo?: string | null
  nightShiftId?: string | null
}) {
  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-background">
        <DevelopmentEmptyState
          icon={UserRound}
          title="ไม่พบพนักงานตามเงื่อนไขที่เลือก"
          description="ลองล้างตัวกรองหรือเปลี่ยนคำค้นหาเพื่อดูรายชื่อพนักงานเพิ่มเติม"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "h-full rounded-xl border border-border/80 bg-background",
        scrollable && "overflow-auto"
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">รายการพนักงาน</p>
          <p className="text-xs text-muted-foreground">เปิดโปรไฟล์ ดูสถานะ และจัดการเอกสารได้จากแต่ละแถว</p>
        </div>
      </div>

      <div className="grid gap-3 p-3 xl:hidden">
        {employees.map((e) => (
          <EmployeeMobileCard
            key={e.id}
            employee={e}
            returnTo={returnTo}
            nightShiftId={nightShiftId}
          />
        ))}
      </div>

      <div className="hidden xl:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <TableRow>
              <TableHead className="min-w-[14rem]">พนักงาน</TableHead>
              <TableHead className="min-w-[11rem]">สังกัด</TableHead>
              <TableHead>เวลาเข้า-ออก</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="min-w-[11rem]">ติดต่อ / เอกสาร</TableHead>
              {nightShiftId && <TableHead className="w-10" title="กะกลางคืน"><Moon className="size-3.5" /></TableHead>}
              <TableHead className="min-w-[11rem] text-right">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <EmployeeTableRow key={e.id} employee={e} returnTo={returnTo} nightShiftId={nightShiftId} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
