import { createClient } from "@/lib/supabase/server"

export type InvStockRow = {
  id: string
  quantity: number
  skuCode: string
  skuName: string
  minStock: number
  barcode: string | null
  isActive: boolean
  warehouseCode: string
  warehouseName: string
  branchName: string
  belowMin: boolean
}

export type StockListFilters = {
  search?: string
  branchId?: string
  warehouseId?: string
  belowMinOnly?: boolean
}

function relationName(value: unknown): string {
  if (!value) return "—"
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined
    return first?.name ?? "—"
  }
  return (value as { name?: string }).name ?? "—"
}

export async function listInvStockRows(
  filters: StockListFilters = {}
): Promise<InvStockRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("inv_stock_balances")
    .select(
      `
      id,
      quantity,
      inv_skus!inner(code, name, min_stock, barcode, is_active),
      inv_warehouses!inner(
        code,
        name,
        branch_id,
        inv_branches(name)
      )
    `
    )
    .order("quantity", { ascending: true })

  if (filters.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const search = filters.search?.trim().toLowerCase()
  const branchId = filters.branchId

  const rows: InvStockRow[] = []

  for (const row of data ?? []) {
    const skuRaw = row.inv_skus as unknown
    const skuJoined = Array.isArray(skuRaw) ? skuRaw[0] : skuRaw
    const sku = skuJoined as {
      code: string
      name: string
      min_stock: number
      barcode: string | null
      is_active: boolean
    }

    const whRaw = row.inv_warehouses as unknown
    const whJoined = Array.isArray(whRaw) ? whRaw[0] : whRaw
    const warehouse = whJoined as {
      code: string
      name: string
      branch_id: string
      inv_branches: unknown
    }

    if (branchId && warehouse.branch_id !== branchId) continue

    const quantity = Number(row.quantity)
    const minStock = Number(sku.min_stock)
    const belowMin = minStock > 0 && quantity < minStock

    if (filters.belowMinOnly && !belowMin) continue

    if (search) {
      const haystack = [
        sku.code,
        sku.name,
        sku.barcode ?? "",
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
      quantity,
      skuCode: sku.code,
      skuName: sku.name,
      minStock,
      barcode: sku.barcode,
      isActive: sku.is_active,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      branchName: relationName(warehouse.inv_branches),
      belowMin,
    })
  }

  rows.sort((a, b) => {
    if (a.belowMin !== b.belowMin) return a.belowMin ? -1 : 1
    return a.skuCode.localeCompare(b.skuCode)
  })

  return rows
}
