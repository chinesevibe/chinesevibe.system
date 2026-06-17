import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { DataTableShell } from "@/components/brand/DataTableShell"
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
import { deleteInvBranch, getInvBranches } from "@/features/inventory/actions/branch"
import { InventoryDeleteButton } from "@/features/inventory/InventoryDeleteButton"
import {
  InventoryLoadError,
  InventorySearchBar,
} from "@/features/inventory/InventorySearchBar"
import { canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  searchParams?: Promise<{ search?: string }>
}

export default async function InventoryBranchesPage({ searchParams }: PageProps) {
  const employee = await requireInventoryMasterData()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const canManage = canManageHr(employee.role)

  const params = await searchParams
  const search = params?.search ?? ""

  let loadError: string | null = null
  let branches: Awaited<ReturnType<typeof getInvBranches>> = []

  try {
    branches = await getInvBranches(search)
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูลสาขาไม่สำเร็จ"
  }

  return (
    <AdminPageShell
      title="สาขา (คลัง)"
      description={
        readOnly
          ? "ดูสาขาระบบคลัง (read-only) — แยกจากสาขา HR"
          : "จัดการสาขาร้านสำหรับระบบคลัง (แยกจาก HR)"
      }
      action={
        canManage ? (
          <Link
            href="/admin/inventory/branches/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + สร้างสาขา
          </Link>
        ) : undefined
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}

      <InventorySearchBar
        basePath="/admin/inventory/branches"
        search={search}
        placeholder="ค้นหา รหัส ชื่อ ที่อยู่"
      />

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>ที่อยู่</TableHead>
              <TableHead>สถานะ</TableHead>
              {canManage ? <TableHead className="text-right">ดำเนินการ</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.length > 0 ? (
              branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.code}</TableCell>
                  <TableCell>{branch.name}</TableCell>
                  <TableCell>{branch.address || "—"}</TableCell>
                  <TableCell>
                    <StatusPill
                      label={branch.is_active ? "ใช้งาน" : "ปิด"}
                      variant={branch.is_active ? "approved" : "neutral"}
                    />
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/inventory/branches/${branch.id}/edit`}
                          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                        >
                          แก้ไข
                        </Link>
                        <InventoryDeleteButton
                          label={`สาขา ${branch.code}`}
                          onDelete={deleteInvBranch.bind(null, branch.id)}
                        />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="py-8 text-center text-muted-foreground"
                >
                  ไม่พบสาขา
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </AdminPageShell>
  )
}
