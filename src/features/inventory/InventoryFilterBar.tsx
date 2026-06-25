"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useTransition } from "react"

import { Button } from "@/components/ui/button"
import type { InventoryFilterOptions } from "@/features/inventory/inventory-filter-utils"

const selectClassName =
  "h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

type InventoryFilterBarProps = {
  options: InventoryFilterOptions
  showType?: boolean
  showDates?: boolean
}

export function InventoryFilterBar({
  options,
  showType = false,
  showDates = false,
}: InventoryFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const branchId = searchParams.get("branch_id") ?? ""
  const warehouseId = searchParams.get("warehouse_id") ?? ""
  const alertType = searchParams.get("type") ?? ""
  const dateFrom = searchParams.get("date_from") ?? ""
  const dateTo = searchParams.get("date_to") ?? ""

  const warehousesForBranch = useMemo(() => {
    if (!branchId) return options.warehouses
    return options.warehouses.filter((warehouse) => warehouse.branch_id === branchId)
  }, [branchId, options.warehouses])
  const branchLabel = options.branches.find((branch) => branch.id === branchId)?.name ?? ""
  const warehouseLabel =
    options.warehouses.find((warehouse) => warehouse.id === warehouseId)?.name ?? ""
  const alertTypeLabel =
    alertType === "expiry"
      ? "ใกล้หมดอายุ"
      : alertType === "low_stock"
        ? "สต็อกต่ำ"
        : alertType === "anomaly"
          ? "ผิดปกติ"
          : ""
  const activeFilters = [
    branchLabel ? `สาขา ${branchLabel}` : "",
    warehouseLabel ? `คลัง ${warehouseLabel}` : "",
    alertTypeLabel ? `ประเภท ${alertTypeLabel}` : "",
    dateFrom ? `ตั้งแต่ ${dateFrom}` : "",
    dateTo ? `ถึง ${dateTo}` : "",
  ].filter(Boolean)

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    if (key === "branch_id") params.delete("warehouse_id")
    startTransition(() => {
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname)
    })
  }

  function clearFilters() {
    startTransition(() => router.replace(pathname))
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">ตัวกรอง</p>
          <p className="text-xs text-muted-foreground">
            เลือกสาขา คลัง และช่วงข้อมูลที่ต้องการดู
          </p>
        </div>
        {activeFilters.length > 0 ? (
          <div className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
            ใช้งานอยู่ {activeFilters.length} ตัว
          </div>
        ) : null}
      </div>

      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((label) => (
            <span
              key={label}
              className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs text-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">สาขา</span>
        <select
          className={selectClassName}
          value={branchId}
          disabled={pending}
          onChange={(e) => updateParam("branch_id", e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {options.branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">คลัง</span>
        <select
          className={selectClassName}
          value={warehouseId}
          disabled={pending}
          onChange={(e) => updateParam("warehouse_id", e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {warehousesForBranch.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </select>
      </label>

      {showType ? (
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">ประเภทแจ้งเตือน</span>
          <select
            className={selectClassName}
            value={alertType}
            disabled={pending}
            onChange={(e) => updateParam("type", e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            <option value="expiry">ใกล้หมดอายุ</option>
            <option value="low_stock">สต็อกต่ำ</option>
            <option value="anomaly">ผิดปกติ</option>
          </select>
        </label>
      ) : null}

      {showDates ? (
        <>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">ตั้งแต่</span>
            <input
              type="date"
              className={selectClassName}
              value={dateFrom}
              disabled={pending}
              onChange={(e) => updateParam("date_from", e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">ถึง</span>
            <input
              type="date"
              className={selectClassName}
              value={dateTo}
              disabled={pending}
              onChange={(e) => updateParam("date_to", e.target.value)}
            />
          </label>
        </>
      ) : null}

      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={clearFilters}>
        ล้างตัวกรอง
      </Button>
      </div>
    </div>
  )
}
