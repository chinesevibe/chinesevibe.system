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
import { deleteInvSku, getInvSkus, getInvUnits } from "@/features/inventory/actions/sku"
import { InventoryDeleteButton } from "@/features/inventory/InventoryDeleteButton"
import {
  InventoryLoadError,
  InventorySearchBar,
} from "@/features/inventory/InventorySearchBar"
import { InventorySkuImportForm } from "@/features/inventory/InventorySkuImportForm"
import { canManageInventory, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

type PageProps = {
  searchParams?: Promise<{ search?: string }>
}

export default async function InventorySkuPage({ searchParams }: PageProps) {
  const employee = await requireInventoryMasterData()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const canManage = canManageInventory(employee)

  const params = await searchParams
  const search = params?.search ?? ""

  let loadError: string | null = null
  let skus: Awaited<ReturnType<typeof getInvSkus>> = []
  let units: Awaited<ReturnType<typeof getInvUnits>> = []

  try {
    ;[skus, units] = await Promise.all([getInvSkus(search), getInvUnits()])
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูล SKU ไม่สำเร็จ"
  }

  const unitsById = new Map(units.map((unit) => [unit.id, unit]))

  return (
    <AdminPageShell
      title="SKU / วัตถุดิบ"
      description={
        readOnly
          ? "ดูข้อมูล SKU (read-only)"
          : "จัดการรหัสสินค้า Barcode หน่วย และ Min/Max"
      }
      action={
        canManage ? (
          <div className="flex items-center gap-2">
            <Link
              href="/admin/inventory/sku/new"
              className={cn(buttonVariants({ size: "sm" }))}
            >
              + สร้าง SKU
            </Link>
          </div>
        ) : undefined
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}

      {canManage ? <InventorySkuImportForm /> : null}

      <InventorySearchBar
        basePath="/admin/inventory/sku"
        search={search}
        placeholder="ค้นหา รหัส ชื่อ หมวด Barcode"
      />

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>หมวด</TableHead>
              <TableHead>หน่วย</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Max</TableHead>
              <TableHead>สถานะ</TableHead>
              {canManage ? <TableHead className="text-right">ดำเนินการ</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {skus.length > 0 ? (
              skus.map((sku) => {
                const unit = sku.unit_id ? unitsById.get(sku.unit_id) : undefined
                return (
                  <TableRow key={sku.id}>
                    <TableCell className="font-medium">{sku.code}</TableCell>
                    <TableCell>{sku.name}</TableCell>
                    <TableCell>{sku.category || "—"}</TableCell>
                    <TableCell>
                      {unit ? unit.abbreviation || unit.name : "—"}
                    </TableCell>
                    <TableCell>{sku.barcode || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {sku.min_stock}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {sku.max_stock}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={sku.is_active ? "ใช้งาน" : "ปิด"}
                        variant={sku.is_active ? "approved" : "neutral"}
                      />
                    </TableCell>
                    {canManage ? (
                      <TableCell>
                        <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/inventory/sku/${sku.id}/edit`}
                          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                        >
                          แก้ไข
                        </Link>
                          <InventoryDeleteButton
                          label={`SKU ${sku.code}`}
                          onDelete={deleteInvSku.bind(null, sku.id)}
                        />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 9 : 8}
                  className="py-8 text-center text-muted-foreground"
                >
                  ไม่พบ SKU
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </AdminPageShell>
  )
}
