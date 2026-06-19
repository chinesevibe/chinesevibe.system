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
  deleteInvSupplier,
  getInvSuppliers,
} from "@/features/inventory/actions/supplier"
import { InventoryDeleteButton } from "@/features/inventory/InventoryDeleteButton"
import {
  InventoryLoadError,
  InventorySearchBar,
} from "@/features/inventory/InventorySearchBar"
import { canManageInventory, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  searchParams?: Promise<{ search?: string }>
}

export default async function InventorySuppliersPage({ searchParams }: PageProps) {
  const employee = await requireInventoryMasterData()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const canManage = canManageInventory(employee)

  const params = await searchParams
  const search = params?.search ?? ""

  let loadError: string | null = null
  let suppliers: Awaited<ReturnType<typeof getInvSuppliers>> = []

  try {
    suppliers = await getInvSuppliers(search)
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูล Supplier ไม่สำเร็จ"
  }

  return (
    <AdminPageShell
      title="Supplier"
      description={
        readOnly
          ? "ดูข้อมูล Supplier (read-only)"
          : "จัดการผู้จัดจำหน่ายและข้อมูลติดต่อ"
      }
      action={
        canManage ? (
          <Link
            href="/admin/inventory/suppliers/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + สร้าง Supplier
          </Link>
        ) : undefined
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}

      <InventorySearchBar
        basePath="/admin/inventory/suppliers"
        search={search}
        placeholder="ค้นหา รหัส ชื่อ ที่อยู่ ติดต่อ"
      />

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>ที่อยู่</TableHead>
              <TableHead>ติดต่อ</TableHead>
              <TableHead>สถานะ</TableHead>
              {canManage ? <TableHead className="text-right">ดำเนินการ</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.code}</TableCell>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.address || "—"}</TableCell>
                  <TableCell>{supplier.contact || "—"}</TableCell>
                  <TableCell>
                    <StatusPill
                      label={supplier.is_active ? "ใช้งาน" : "ปิด"}
                      variant={supplier.is_active ? "approved" : "neutral"}
                    />
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/inventory/suppliers/${supplier.id}/edit`}
                          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                        >
                          แก้ไข
                        </Link>
                        <InventoryDeleteButton
                          label={`Supplier ${supplier.code}`}
                          onDelete={deleteInvSupplier.bind(null, supplier.id)}
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
                  ไม่พบ Supplier
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </AdminPageShell>
  )
}
