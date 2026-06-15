import { formatThaiDate } from "@/lib/datetime/thailand"
import { createClient } from "@/lib/supabase/server"

export type InventoryLowStockRow = {
  code: string
  name: string
  qty: number
  minStock: number
}

export type InventoryPendingInboundRow = {
  id: string
  supplierName: string
  warehouseName: string
  createdAt: string
}

export type InventoryZeroStockRow = {
  code: string
  name: string
}

export type InventoryDashboardSummary = {
  lowStockCount: number
  lowStockRows: InventoryLowStockRow[]
  pendingInboundCount: number
  pendingInboundRows: InventoryPendingInboundRow[]
  zeroStockCount: number
  zeroStockRows: InventoryZeroStockRow[]
  hasStockData: boolean
}

function relationName(value: unknown): string {
  if (!value) return "—"
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined
    return first?.name ?? "—"
  }
  return (value as { name?: string }).name ?? "—"
}

export async function getInventoryDashboardSummary(): Promise<InventoryDashboardSummary> {
  const supabase = await createClient()

  const [skusRes, balancesRes, pendingCountRes, pendingRes] = await Promise.all([
    supabase
      .from("inv_skus")
      .select("id, code, name, min_stock, is_active")
      .eq("is_active", true)
      .order("code", { ascending: true }),
    supabase.from("inv_stock_balances").select("sku_id, quantity"),
    supabase
      .from("inv_inbound_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("inv_inbound_orders")
      .select("id, created_at, inv_suppliers(name), inv_warehouses(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  if (skusRes.error) throw new Error(skusRes.error.message)
  if (balancesRes.error) throw new Error(balancesRes.error.message)
  if (pendingCountRes.error) throw new Error(pendingCountRes.error.message)
  if (pendingRes.error) throw new Error(pendingRes.error.message)

  const qtyBySku = new Map<string, number>()
  for (const row of balancesRes.data ?? []) {
    const skuId = row.sku_id as string
    const qty = Number(row.quantity)
    qtyBySku.set(skuId, (qtyBySku.get(skuId) ?? 0) + qty)
  }

  const hasStockData = (balancesRes.data ?? []).length > 0
  const lowStockAll: InventoryLowStockRow[] = []
  const zeroStockAll: InventoryZeroStockRow[] = []

  for (const sku of skusRes.data ?? []) {
    const id = sku.id as string
    const qty = qtyBySku.get(id) ?? 0
    const minStock = Number(sku.min_stock)

    if (qty === 0) {
      zeroStockAll.push({
        code: sku.code as string,
        name: sku.name as string,
      })
    }

    if (minStock > 0 && qty < minStock) {
      lowStockAll.push({
        code: sku.code as string,
        name: sku.name as string,
        qty,
        minStock,
      })
    }
  }

  const pendingInboundRows = (pendingRes.data ?? []).map((row) => ({
    id: row.id as string,
    supplierName: relationName(row.inv_suppliers),
    warehouseName: relationName(row.inv_warehouses),
    createdAt: row.created_at
      ? formatThaiDate(row.created_at as string)
      : "—",
  }))

  return {
    lowStockCount: lowStockAll.length,
    lowStockRows: lowStockAll.slice(0, 5),
    pendingInboundCount: pendingCountRes.count ?? pendingInboundRows.length,
    pendingInboundRows,
    zeroStockCount: zeroStockAll.length,
    zeroStockRows: zeroStockAll.slice(0, 5),
    hasStockData,
  }
}
