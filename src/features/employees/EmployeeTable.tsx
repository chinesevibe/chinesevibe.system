"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, MoreVertical } from "lucide-react"

import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { StatusPill } from "@/components/brand/StatusPill"
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
import { formatThaiSlashDate } from "@/lib/datetime/thailand"
import { appendReturnTo } from "@/lib/navigation/return-to"
import { payTypeDisplayLabel } from "@/lib/payroll/pay-type"
import { cn } from "@/lib/utils"

const BRANCH_PILL_VARIANTS = [
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
] as const

function displayEmployeeCode(e: EmployeeRow): string {
  return e.employee_code?.trim() || e.id.slice(0, 8).toUpperCase()
}

function branchPillClass(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i)) % BRANCH_PILL_VARIANTS.length
  }
  return BRANCH_PILL_VARIANTS[hash] ?? BRANCH_PILL_VARIANTS[0]
}

function stopRowNav(event: React.MouseEvent) {
  event.stopPropagation()
}

function EmployeeMobileCard({
  employee: e,
  returnTo,
}: {
  employee: EmployeeRow
  returnTo?: string | null
}) {
  const profileHref = appendReturnTo(`/admin/employees/${e.id}`, returnTo)
  const statusPill = employeeDisplayStatusPill(e.displayStatus)
  const branchLabel = e.branch_name
    ? e.branch_name
    : e.displayStatus === "onboarding" || e.displayStatus === "pending_approval"
      ? "รอกำหนดสาขา"
      : "—"

  return (
    <Link
      href={profileHref}
      className="block rounded-2xl border border-border/70 bg-background p-4 shadow-sm transition hover:border-brand-red/30 hover:bg-brand-red/5"
      aria-label={`เปิดโปรไฟล์ ${e.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <EmployeeAvatar name={e.name} imageUrl={e.avatarUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{e.name}</p>
            <p className="text-xs font-medium tabular-nums text-muted-foreground">
              {displayEmployeeCode(e)}
            </p>
          </div>
        </div>
        <StatusPill label={statusPill.label} variant={statusPill.variant} />
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <p className="truncate text-muted-foreground">{e.position ?? e.department ?? "—"}</p>
        <p className="whitespace-nowrap tabular-nums text-foreground">{e.work_time_text}</p>
        <p className="truncate text-muted-foreground">{branchLabel}</p>
        <p className="truncate text-xs text-muted-foreground">
          {e.phone?.trim() ? `โทร ${e.phone}` : "ไม่มีเบอร์ติดต่อ"}
        </p>
      </div>
    </Link>
  )
}

function EmployeeTableRow({
  employee: e,
  returnTo,
}: {
  employee: EmployeeRow
  returnTo?: string | null
}) {
  const router = useRouter()
  const profileHref = appendReturnTo(`/admin/employees/${e.id}`, returnTo)
  const statusPill = employeeDisplayStatusPill(e.displayStatus)

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/30"
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
      <TableCell className="whitespace-nowrap text-sm font-medium tabular-nums text-muted-foreground">
        <Link
          href={profileHref}
          className="hover:text-brand-red hover:underline"
          onClick={stopRowNav}
        >
          {displayEmployeeCode(e)}
        </Link>
      </TableCell>
      <TableCell className="min-w-[10rem]">
        <div className="flex min-w-0 items-center gap-2.5">
          <EmployeeAvatar name={e.name} imageUrl={e.avatarUrl} size="sm" />
          <Link
            href={profileHref}
            className="min-w-0 font-medium text-foreground underline-offset-4 hover:text-brand-red hover:underline"
            onClick={stopRowNav}
          >
            {e.name}
          </Link>
        </div>
      </TableCell>
      <TableCell className="max-w-[8rem] truncate text-sm">
        {e.department ?? "—"}
      </TableCell>
      <TableCell className="max-w-[9rem] truncate text-sm">
        {e.position ?? "—"}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm tabular-nums">
        {e.work_time_text}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {e.branch_name ? (
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
              branchPillClass(e.branch_name)
            )}
          >
            {e.branch_name}
          </span>
        ) : e.displayStatus === "onboarding" ||
          e.displayStatus === "pending_approval" ? (
          <StatusPill label="รอกำหนดสาขา" variant="pending" />
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <StatusPill label={statusPill.label} variant={statusPill.variant} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {payTypeDisplayLabel(e.pay_type)}
      </TableCell>
      <TableCell className="whitespace-nowrap" onClick={stopRowNav}>
        <LineLinkBadge lineUserId={e.line_user_id} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm tabular-nums">
        {e.phone?.trim() ? (
          <a
            href={`tel:${e.phone.replace(/\s/g, "")}`}
            className="hover:text-brand-red hover:underline"
            onClick={stopRowNav}
          >
            {e.phone}
          </a>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm tabular-nums">
        {formatThaiSlashDate(e.contract_start)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm tabular-nums">
        {formatThaiSlashDate(e.probation_end)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <StatusPill
          label={e.visaStatus.label}
          variant={e.visaStatus.variant}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <StatusPill
          label={e.workPermitStatus.label}
          variant={e.workPermitStatus.variant}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap" onClick={stopRowNav}>
        {e.contract_file_path ? (
          <a
            href={`/api/employees/${e.id}/contract`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-brand-red hover:underline"
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            เปิดไฟล์
          </a>
        ) : e.contract_start ? (
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
            onClick={stopRowNav}
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            แนบสัญญา
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell onClick={stopRowNav}>
        <Link
          href={profileHref}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`เปิดโปรไฟล์ ${e.name}`}
        >
          <MoreVertical className="size-4" />
        </Link>
      </TableCell>
    </TableRow>
  )
}

export function EmployeeTable({
  employees,
  scrollable = false,
  returnTo,
}: {
  employees: EmployeeRow[]
  scrollable?: boolean
  returnTo?: string | null
}) {
  if (employees.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        ไม่พบพนักงานตามเงื่อนไขที่เลือก
      </p>
    )
  }

  return (
    <div
      className={cn(
        "h-full rounded-xl border border-border/80 bg-background",
        scrollable && "overflow-auto"
      )}
    >
      <div className="grid gap-3 p-3 sm:grid-cols-2 xl:hidden">
        {employees.map((e) => (
          <EmployeeMobileCard key={e.id} employee={e} returnTo={returnTo} />
        ))}
      </div>

      <div className="hidden xl:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="w-[5.5rem]">รหัส</TableHead>
              <TableHead className="min-w-[10rem]">ชื่อ-นามสกุล</TableHead>
              <TableHead>แผนก</TableHead>
              <TableHead>ตำแหน่ง</TableHead>
              <TableHead>เวลาเข้า-ออก</TableHead>
              <TableHead>สาขา</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>ประเภทจ้าง</TableHead>
              <TableHead>LINE</TableHead>
              <TableHead>โทร</TableHead>
              <TableHead>เริ่มงาน</TableHead>
              <TableHead>ทดลองถึง</TableHead>
              <TableHead>วีซ่า</TableHead>
              <TableHead>Work Permit</TableHead>
              <TableHead>สัญญา</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <EmployeeTableRow key={e.id} employee={e} returnTo={returnTo} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
