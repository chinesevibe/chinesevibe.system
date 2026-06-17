import { createClient } from "@/lib/supabase/server"

import type { StockListFilters } from "@/features/inventory/stock-data"

function relationName(value: unknown): string {
  if (!value) return "—"
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined
    return first?.name ?? "—"
  }
  return (value as { name?: string }).name ?? "—"
}

export type InvStockLotRow = {
  id: string
  lotNumber: string
  expiryDate: string | null
  receivedDate: string | null
  remainingQty: number
  status: string
  skuCode: string
  skuName: string
  warehouseCode: string
  warehouseName: string
  branchName: string
}

export async function listInvStockLotRows(
  filters: StockListFilters = {}
): Promise<InvStockLotRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("inv_stock_lots")
    .select(
      `
      id,
      lot_number,
      expiry_date,
      received_date,
      remaining_qty,
      status,
      inv_skus!inner(code, name, is_active),
      inv_warehouses!inner(
        code,
        name,
        branch_id,
        inv_branches(name)
      )
    `
    )
    .gt("remaining_qty", 0)
    .order("expiry_date", { ascending: true, nullsFirst: false })

  if (filters.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const search = filters.search?.trim().toLowerCase()
  const branchId = filters.branchId
  const rows: InvStockLotRow[] = []

  for (const row of data ?? []) {
    const skuRaw = row.inv_skus as unknown
    const skuJoined = Array.isArray(skuRaw) ? skuRaw[0] : skuRaw
    const sku = skuJoined as { code: string; name: string; is_active: boolean }

    const whRaw = row.inv_warehouses as unknown
    const whJoined = Array.isArray(whRaw) ? whRaw[0] : whRaw
    const warehouse = whJoined as {
      code: string
      name: string
      branch_id: string
      inv_branches: unknown
    }

    if (branchId && warehouse.branch_id !== branchId) continue

    if (search) {
      const haystack = [
        sku.code,
        sku.name,
        row.lot_number as string,
        warehouse.code,
        warehouse.name,
        relationName(warehouse.inv_branches),
      ]
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(search)) continue
    }

    rows.push({
      id: row.id as string,
      lotNumber: row.lot_number as string,
      expiryDate: (row.expiry_date as string | null) ?? null,
      receivedDate: (row.received_date as string | null) ?? null,
      remainingQty: Number(row.remaining_qty),
      status: row.status as string,
      skuCode: sku.code,
      skuName: sku.name,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      branchName: relationName(warehouse.inv_branches),
    })
  }

  return rows
}
