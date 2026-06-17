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
import {
  deleteInvWarehouse,
  getInvWarehousesWithBranch,
} from "@/features/inventory/actions/warehouse"
import { InventoryDeleteButton } from "@/features/inventory/InventoryDeleteButton"
import {
  InventoryLoadError,
  InventorySearchBar,
} from "@/features/inventory/InventorySearchBar"
import type { InvWarehouseWithBranch } from "@/features/inventory/types"
import { canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

function branchName(row: InvWarehouseWithBranch): string {
  const branch = row.inv_branches
  if (!branch) return "—"
  if (Array.isArray(branch)) return branch[0]?.name ?? "—"
  return branch.name
}

type PageProps = {
  searchParams?: Promise<{ search?: string }>
}

export default async function InventoryWarehousesPage({ searchParams }: PageProps) {
  const employee = await requireInventoryMasterData()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const canManage = canManageHr(employee.role)

  const params = await searchParams
  const search = params?.search ?? ""

  let loadError: string | null = null
  let warehouses: Awaited<ReturnType<typeof getInvWarehousesWithBranch>> = []

  try {
    warehouses = await getInvWarehousesWithBranch(search)
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูลคลังไม่สำเร็จ"
  }

  return (
    <AdminPageShell
      title="คลังสินค้า"
      description={
        readOnly
          ? "ดูคลังสินค้า (read-only)"
          : "จัดการ Main/Sub warehouse ต่อสาขา"
      }
      action={
        canManage ? (
          <Link
            href="/admin/inventory/warehouses/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + สร้างคลัง
          </Link>
        ) : undefined
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}

      <InventorySearchBar
        basePath="/admin/inventory/warehouses"
        search={search}
        placeholder="ค้นหา รหัส ชื่อคลัง"
      />

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>สาขา</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>สถานะ</TableHead>
              {canManage ? <TableHead className="text-right">ดำเนินการ</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehouses.length > 0 ? (
              warehouses.map((warehouse) => (
                <TableRow key={warehouse.id}>
                  <TableCell className="font-medium">{warehouse.code}</TableCell>
                  <TableCell>{warehouse.name}</TableCell>
                  <TableCell>{branchName(warehouse)}</TableCell>
                  <TableCell className="uppercase">{warehouse.type}</TableCell>
                  <TableCell>
                    <StatusPill
                      label={warehouse.is_active ? "ใช้งาน" : "ปิด"}
                      variant={warehouse.is_active ? "approved" : "neutral"}
                    />
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/inventory/warehouses/${warehouse.id}/edit`}
                          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                        >
                          แก้ไข
                        </Link>
                        <InventoryDeleteButton
                          label={`คลัง ${warehouse.code}`}
                          onDelete={deleteInvWarehouse.bind(null, warehouse.id)}
                        />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 6 : 5}
                  className="py-8 text-center text-muted-foreground"
                >
                  ไม่พบคลังสินค้า
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </AdminPageShell>
  )
}
