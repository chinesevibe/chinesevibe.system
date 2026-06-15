import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { DataTableShell } from "@/components/brand/DataTableShell"
import { StatusPill } from "@/components/brand/StatusPill"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getInvBranches } from "@/features/inventory/actions/branch"
import { getInvWarehousesWithBranch } from "@/features/inventory/actions/warehouse"
import { InventoryLoadError } from "@/features/inventory/InventorySearchBar"
import { listInvStockRows } from "@/features/inventory/stock-data"
import { StockFilters } from "@/features/inventory/StockFilters"
import { isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<{
    search?: string
    branch_id?: string
    warehouse_id?: string
    below_min?: string
  }>
}

export default async function InventoryStockPage({ searchParams }: PageProps) {
  const employee = await requireInventoryPortal()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)

  const params = await searchParams
  const search = params?.search ?? ""
  const branchId = params?.branch_id ?? ""
  const warehouseId = params?.warehouse_id ?? ""
  const belowMinOnly = params?.below_min === "1"

  let loadError: string | null = null
  let rows: Awaited<ReturnType<typeof listInvStockRows>> = []
  let branches: Awaited<ReturnType<typeof getInvBranches>> = []
  let warehouses: Awaited<ReturnType<typeof getInvWarehousesWithBranch>> = []

  try {
    ;[rows, branches, warehouses] = await Promise.all([
      listInvStockRows({
        search,
        branchId: branchId || undefined,
        warehouseId: warehouseId || undefined,
        belowMinOnly,
      }),
      getInvBranches(),
      getInvWarehousesWithBranch(),
    ])
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูลสต็อกไม่สำเร็จ"
  }

  return (
    <AdminPageShell
      title="สต็อกคงเหลือ"
      description={
        readOnly
          ? "ดูยอดสต็อกตาม SKU และคลัง (read-only)"
          : "ยอดคงเหลือจาก inv_stock_balances — กรองต่ำกว่า Min ได้"
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}

      <StockFilters
        branches={branches}
        warehouses={warehouses}
        search={search}
        branchId={branchId}
        warehouseId={warehouseId}
        belowMinOnly={belowMinOnly}
      />

      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>สาขา</TableHead>
              <TableHead>คลัง</TableHead>
              <TableHead className="text-right">คงเหลือ</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead>สถานะ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.skuCode}</TableCell>
                  <TableCell>{row.skuName}</TableCell>
                  <TableCell>{row.branchName}</TableCell>
                  <TableCell>
                    {row.warehouseName}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({row.warehouseCode})
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.minStock}</TableCell>
                  <TableCell>
                    {row.quantity === 0 ? (
                      <StatusPill label="หมด" variant="rejected" />
                    ) : row.belowMin ? (
                      <StatusPill label="ต่ำกว่า Min" variant="pending" />
                    ) : (
                      <StatusPill label="ปกติ" variant="approved" />
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {belowMinOnly
                    ? "ไม่พบ SKU ที่ต่ำกว่า Min"
                    : "ยังไม่มีข้อมูลสต็อก — รับเข้าสินค้าหรือรัน demo seed migration"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </AdminPageShell>
  )
}
