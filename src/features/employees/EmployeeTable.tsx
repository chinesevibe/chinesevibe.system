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
import type { EmployeeRow } from "@/features/employees/data"
import { formatThaiSlashDate } from "@/lib/datetime/thailand"
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

function formatSalary(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—"
  return value.toLocaleString("th-TH")
}

function stopRowNav(event: React.MouseEvent) {
  event.stopPropagation()
}

function EmployeeTableRow({ employee: e }: { employee: EmployeeRow }) {
  const router = useRouter()
  const profileHref = `/admin/employees/${e.id}`

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
      <TableCell className="text-sm font-medium tabular-nums text-muted-foreground">
        <Link
          href={profileHref}
          className="hover:text-brand-red hover:underline"
          onClick={stopRowNav}
        >
          {displayEmployeeCode(e)}
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
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
      <TableCell className="text-sm">{e.position ?? "—"}</TableCell>
      <TableCell>
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
      <TableCell className="text-right text-sm tabular-nums">
        {formatSalary(e.salary)}
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {formatThaiSlashDate(e.contract_start)}
      </TableCell>
      <TableCell onClick={stopRowNav}>
        {e.contract_file_path ? (
          <a
            href={`/api/employees/${e.id}/contract`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-red hover:underline"
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            <span>
              สัญญาจ้าง
              {e.contract_start
                ? ` (${formatThaiSlashDate(e.contract_start)})`
                : ""}
            </span>
          </a>
        ) : e.contract_start ? (
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            <span>แนบสัญญา ({formatThaiSlashDate(e.contract_start)})</span>
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
}: {
  employees: EmployeeRow[]
  scrollable?: boolean
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
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-[100px]">รหัสพนักงาน</TableHead>
            <TableHead>ชื่อ-นามสกุล</TableHead>
            <TableHead>ตำแหน่ง</TableHead>
            <TableHead>สาขา</TableHead>
            <TableHead className="text-right">เงินเดือน</TableHead>
            <TableHead>วันเริ่มงาน</TableHead>
            <TableHead>สัญญาจ้าง</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <EmployeeTableRow key={e.id} employee={e} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
