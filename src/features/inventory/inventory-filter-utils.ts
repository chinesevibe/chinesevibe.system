import type {
  InventoryAlertType,
  InventoryReportFilters,
} from "@/features/inventory/expansion-data"

export type InventoryFilterOptions = {
  branches: Array<{ id: string; name: string }>
  warehouses: Array<{ id: string; name: string; branch_id: string }>
}

export type InventoryPageFilters = InventoryReportFilters & {
  type?: InventoryAlertType | ""
}

export function parseInventoryFilters(
  params?: Record<string, string | string[] | undefined>
): InventoryPageFilters {
  const pick = (key: string) => {
    const value = params?.[key]
    return typeof value === "string" && value.length > 0 ? value : undefined
  }

  const type = pick("type")
  return {
    branchId: pick("branch_id"),
    warehouseId: pick("warehouse_id"),
    dateFrom: pick("date_from"),
    dateTo: pick("date_to"),
    type:
      type === "expiry" || type === "low_stock" || type === "anomaly"
        ? type
        : "",
  }
}
