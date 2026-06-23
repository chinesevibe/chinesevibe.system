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
  expiringOnly,
}: {
  branches: InvBranch[]
  warehouses: InvWarehouseWithBranch[]
  search: string
  branchId: string
  warehouseId: string
  belowMinOnly: boolean
  expiringOnly: boolean
}) {
  const filteredWarehouses = branchId
    ? warehouses.filter((w) => w.branch_id === branchId)
    : warehouses

  const hasFilters = Boolean(search || branchId || warehouseId || belowMinOnly || expiringOnly)
  const activeFilterCount = [
    search,
    branchId,
    warehouseId,
    belowMinOnly ? "1" : "",
    expiringOnly ? "1" : "",
  ].filter(Boolean).length

  return (
    <form
      className="mb-4 flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/20 p-3"
      action="/admin/inventory/stock"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">ตัวกรองสต็อก</p>
          <p className="text-xs text-muted-foreground">
            ค้นหา SKU และจำกัดขอบเขตตามสาขา/คลัง ก่อนดู on-hand และ FEFO ด้านล่าง
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {hasFilters ? `ใช้งานอยู่ ${activeFilterCount} ตัวกรอง` : "ยังไม่ได้กรอง"}
        </div>
      </div>

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
        <label className="flex items-end gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            name="expiring"
            value="1"
            defaultChecked={expiringOnly}
            className="size-4 rounded border-input"
          />
          <span>เฉพาะใกล้หมดอายุ</span>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
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
        <Link
          href={belowMinOnly ? "/admin/inventory/stock" : "/admin/inventory/stock?below_min=1"}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {belowMinOnly ? "กลับไปดูทั้งหมด" : "ดูเฉพาะต่ำกว่า Min"}
        </Link>
        <Link
          href={expiringOnly ? "/admin/inventory/stock" : "/admin/inventory/stock?expiring=1#lot-workspace"}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {expiringOnly ? "ปิดตัวกรองใกล้หมดอายุ" : "ดูเฉพาะใกล้หมดอายุ"}
        </Link>
      </div>
    </form>
  )
}
