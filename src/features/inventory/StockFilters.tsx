import Link from "next/link"

import { invInputClass } from "@/features/inventory/form-styles"
import type { InvBranch } from "@/features/inventory/types"
import type { InvWarehouseWithBranch } from "@/features/inventory/types"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function StockFilters({
  branches,
  warehouses,
  search,
  branchId,
  warehouseId,
  belowMinOnly,
}: {
  branches: InvBranch[]
  warehouses: InvWarehouseWithBranch[]
  search: string
  branchId: string
  warehouseId: string
  belowMinOnly: boolean
}) {
  const filteredWarehouses = branchId
    ? warehouses.filter((w) => w.branch_id === branchId)
    : warehouses

  const hasFilters = Boolean(search || branchId || warehouseId || belowMinOnly)

  return (
    <form
      className="mb-4 flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-3"
      action="/admin/inventory/stock"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="text-muted-foreground">ค้นหา SKU / คลัง</span>
          <input
            name="search"
            defaultValue={search}
            placeholder="รหัส ชื่อ barcode"
            className={cn(invInputClass, "mt-1")}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">สาขา (คลัง)</span>
          <select
            name="branch_id"
            defaultValue={branchId}
            className={cn(invInputClass, "mt-1")}
          >
            <option value="">— ทั้งหมด —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">คลังสินค้า</span>
          <select
            name="warehouse_id"
            defaultValue={warehouseId}
            className={cn(invInputClass, "mt-1")}
          >
            <option value="">— ทั้งหมด —</option>
            {filteredWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            name="below_min"
            value="1"
            defaultChecked={belowMinOnly}
            className="size-4 rounded border-input"
          />
          <span>เฉพาะต่ำกว่า Min</span>
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" size="sm">
          กรอง
        </Button>
        {hasFilters ? (
          <Link
            href="/admin/inventory/stock"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ล้างตัวกรอง
          </Link>
        ) : null}
      </div>
    </form>
  )
}
