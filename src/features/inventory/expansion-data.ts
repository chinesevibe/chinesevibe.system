import { formatThaiDate } from "@/lib/datetime/thailand"
import { createClient } from "@/lib/supabase/server"

import { listInvStockRows } from "./stock-data"

export type InventoryAlertType = "expiry" | "low_stock" | "anomaly"
export type InventoryAlertSeverity = "low" | "medium" | "high"

export type InventoryAlertRow = {
  id: string
  type: InventoryAlertType
  severity: InventoryAlertSeverity
  title: string
  detail: string
  branchName: string
  warehouseName: string | null
  href: string
  daysLeft?: number | null
  qty?: number | null
  value?: number | null
}

export type InventoryDashboardKpis = {
  totalStockValue: number
  skuCount: number
  belowMinCount: number
  expiry7dCount: number
  inboundValueMtd: number
  consumptionValueMtd: number
  damageValueMtd: number
  pendingRequisitions: number
  inTransitTransfers: number
  pendingDamageApprovals: number
}

export type InventoryDashboardData = {
  kpis: InventoryDashboardKpis
  stockValueTrend: Array<{ label: string; value: number }>
  inboundVsConsumption: Array<{ label: string; inbound: number; consumption: number }>
  damageTrend: Array<{ label: string; damage: number }>
  categoryShare: Array<{ name: string; value: number }>
}

export type InventoryReportKind =
  | "stock"
  | "inbound"
  | "requisition"
  | "consumption"
  | "damage"
  | "transfer"
  | "variance"
  | "audit"

export type InventoryReportFilters = {
  branchId?: string
  warehouseId?: string
  skuId?: string
  dateFrom?: string
  dateTo?: string
}

export type InventoryReportResult = {
  headers: string[]
  rows: string[][]
  summary: string
}

type CostMap = Map<string, number>

function relationName(value: unknown): string {
  if (!value) return "—"
  if (Array.isArray(value)) return (value[0] as { name?: string } | undefined)?.name ?? "—"
  return (value as { name?: string }).name ?? "—"
}

function monthStart(today: Date) {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

async function latestCostBySkuIds(skuIds: string[]): Promise<CostMap> {
  const supabase = await createClient()
  const entries = await Promise.all(
    Array.from(new Set(skuIds.filter(Boolean))).map(async (skuId) => {
      const { data, error } = await supabase.rpc("inv_latest_sku_cost", {
        p_sku_id: skuId,
      })
      if (error) throw new Error(error.message)
      return [skuId, data == null ? 0 : Number(data)] as const
    })
  )
  return new Map(entries)
}

async function getBranchWarehouseMaps() {
  const supabase = await createClient()
  const [{ data: branches, error: branchError }, { data: warehouses, error: warehouseError }] =
    await Promise.all([
      supabase.from("inv_branches").select("id, name"),
      supabase.from("inv_warehouses").select("id, name, branch_id"),
    ])
  if (branchError) throw new Error(branchError.message)
  if (warehouseError) throw new Error(warehouseError.message)
  return {
    branchNames: new Map((branches ?? []).map((row) => [row.id as string, row.name as string])),
    warehouseInfo: new Map(
      (warehouses ?? []).map((row) => [
        row.id as string,
        { name: row.name as string, branch_id: row.branch_id as string },
      ])
    ),
  }
}

export async function getInventoryAlerts(filters: InventoryReportFilters & { type?: InventoryAlertType | "" }) {
  const supabase = await createClient()
  const today = new Date()
  const todayIso = isoDate(today)
  const expiry30 = isoDate(addDays(today, 30))
  const { branchNames, warehouseInfo } = await getBranchWarehouseMaps()

  const [stockRows, inboundLotsRes, damagesRes, stockCountsRes] = await Promise.all([
    listInvStockRows({
      branchId: filters.branchId,
      warehouseId: filters.warehouseId,
    }),
    supabase
      .from("inv_inbound_items")
      .select("id, sku_id, quantity, lot_number, expiry_date, inbound_order_id, inv_inbound_orders!inner(status, warehouse_id), inv_skus(code, name)")
      .not("expiry_date", "is", null)
      .gte("expiry_date", todayIso)
      .lte("expiry_date", expiry30),
    supabase
      .from("inv_damages")
      .select("id, branch_id, warehouse_id, sku_id, cost_value, status, created_at, inv_skus(code, name)")
      .eq("status", "approved")
      .gte("created_at", monthStart(today).toISOString()),
    supabase
      .from("inv_stock_count_items")
      .select("id, count_id, sku_id, system_qty, physical_qty, inv_stock_counts!inner(status, branch_id, warehouse_id), inv_skus(code, name)")
      .eq("inv_stock_counts.status", "completed"),
  ])

  if (inboundLotsRes.error) throw new Error(inboundLotsRes.error.message)
  if (damagesRes.error) throw new Error(damagesRes.error.message)
  if (stockCountsRes.error) throw new Error(stockCountsRes.error.message)

  const stockValueBySku = new Map<string, number>()
  const costMap = await latestCostBySkuIds([
    ...stockRows.map((row) => row.id),
    ...((damagesRes.data ?? []) as Array<{ sku_id: string }>).map((row) => row.sku_id),
  ])

  for (const row of stockRows) {
    const cost = costMap.get(row.id) ?? 0
    stockValueBySku.set(row.id, row.quantity * cost)
  }

  const alerts: InventoryAlertRow[] = []

  for (const row of stockRows) {
    if (row.belowMin) {
      alerts.push({
        id: `low-${row.id}`,
        type: "low_stock",
        severity: row.quantity === 0 ? "high" : "medium",
        title: `${row.skuCode} ต่ำกว่า Min`,
        detail: `${row.skuName} คงเหลือ ${row.quantity} ต่ำกว่า Min ${row.minStock}`,
        branchName: row.branchName,
        warehouseName: row.warehouseName,
        href: "/admin/inventory/stock?below_min=1",
        qty: row.quantity,
      })
    }
  }

  for (const row of inboundLotsRes.data ?? []) {
    const orderRaw = row.inv_inbound_orders as unknown
    const order = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw
    const warehouseId = (order as { warehouse_id?: string } | null)?.warehouse_id ?? null
    if (filters.warehouseId && warehouseId !== filters.warehouseId) continue
    const warehouse = warehouseId ? warehouseInfo.get(warehouseId) : null
    if (filters.branchId && warehouse?.branch_id !== filters.branchId) continue
    const expiryDate = row.expiry_date as string
    const daysLeft = Math.max(
      0,
      Math.ceil((Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000)
    )
    const skuRaw = row.inv_skus as unknown
    const sku = Array.isArray(skuRaw) ? skuRaw[0] : skuRaw
    alerts.push({
      id: `expiry-${row.id as string}`,
      type: "expiry",
      severity: daysLeft <= 7 ? "high" : daysLeft <= 14 ? "medium" : "low",
      title: `${(sku as { code?: string } | null)?.code ?? "SKU"} ใกล้หมดอายุ`,
      detail: `${(sku as { name?: string } | null)?.name ?? "—"} · Lot ${(row.lot_number as string | null) ?? "—"} · เหลือ ${daysLeft} วัน`,
      branchName: warehouse?.branch_id ? branchNames.get(warehouse.branch_id) ?? "—" : "—",
      warehouseName: warehouse?.name ?? null,
      href: "/admin/inventory/inbound",
      daysLeft,
      qty: Number(row.quantity),
    })
  }

  for (const row of damagesRes.data ?? []) {
    const skuId = row.sku_id as string
    const stockValue = stockValueBySku.get(skuId) ?? 0
    const damageValue = Number(row.cost_value ?? 0)
    if (stockValue > 0 && damageValue / stockValue > 0.05) {
      alerts.push({
        id: `anomaly-damage-${row.id as string}`,
        type: "anomaly",
        severity: damageValue / stockValue > 0.1 ? "high" : "medium",
        title: "Damage สูงผิดปกติ",
        detail: `${((Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as { code?: string } | null)?.code ?? "SKU"} · มูลค่าเสียหาย ${damageValue.toLocaleString("th-TH")} บาท`,
        branchName: branchNames.get(row.branch_id as string) ?? "—",
        warehouseName: warehouseInfo.get(row.warehouse_id as string)?.name ?? null,
        href: `/admin/inventory/damage/${row.id as string}`,
        value: damageValue,
      })
    }
  }

  for (const row of stockCountsRes.data ?? []) {
    const physical = row.physical_qty == null ? null : Number(row.physical_qty)
    const systemQty = Number(row.system_qty)
    if (physical == null || systemQty <= 0) continue
    const varianceRatio = Math.abs(physical - systemQty) / systemQty
    if (varianceRatio > 0.1) {
      const countRaw = row.inv_stock_counts as unknown
      const count = Array.isArray(countRaw) ? countRaw[0] : countRaw
      const warehouseId = (count as { warehouse_id?: string } | null)?.warehouse_id ?? null
      alerts.push({
        id: `anomaly-count-${row.id as string}`,
        type: "anomaly",
        severity: varianceRatio > 0.25 ? "high" : "medium",
        title: "Variance สูงผิดปกติ",
        detail: `${((Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as { code?: string; name?: string } | null)?.code ?? "SKU"} · ระบบ ${systemQty} / นับจริง ${physical}`,
        branchName: branchNames.get((count as { branch_id?: string } | null)?.branch_id ?? "") ?? "—",
        warehouseName: warehouseId ? warehouseInfo.get(warehouseId)?.name ?? null : null,
        href: "/admin/inventory/reports/variance",
      })
    }
  }

  return alerts
    .filter((row) => !filters.type || row.type === filters.type)
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
}

export async function getInventoryAlertCount() {
  const alerts = await getInventoryAlerts({})
  return alerts.length
}

export async function getInventoryDashboardData(filters: InventoryReportFilters = {}): Promise<InventoryDashboardData> {
  const supabase = await createClient()
  const today = new Date()
  const monthStartIso = monthStart(today).toISOString()
  const stockRows = await listInvStockRows({
    branchId: filters.branchId,
    warehouseId: filters.warehouseId,
  })
  const skuIds = stockRows.map((row) => row.id)
  const costMap = await latestCostBySkuIds(skuIds)

  const [inboundRes, reqRes, damagePendingRes, transferRes, consumptionRes, movementsRes, damageRes, skuRes] =
    await Promise.all([
      supabase
        .from("inv_inbound_items")
        .select("quantity, cost_per_unit, created_at, inv_inbound_orders!inner(status, warehouse_id), inv_skus(category)")
        .eq("inv_inbound_orders.status", "approved")
        .gte("created_at", monthStartIso),
      supabase.from("inv_requisitions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("inv_damages").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("inv_transfers").select("id", { count: "exact", head: true }).eq("status", "in_transit"),
      supabase.from("inv_consumptions").select("sku_id, qty, recorded_at").gte("recorded_at", monthStartIso),
      supabase.from("inv_stock_movements").select("movement_type, quantity, created_at, warehouse_id, sku_id"),
      supabase.from("inv_damages").select("cost_value, created_at").eq("status", "approved").gte("created_at", monthStartIso),
      supabase.from("inv_skus").select("id, category").eq("is_active", true),
    ])

  if (inboundRes.error) throw new Error(inboundRes.error.message)
  if (reqRes.error) throw new Error(reqRes.error.message)
  if (damagePendingRes.error) throw new Error(damagePendingRes.error.message)
  if (transferRes.error) throw new Error(transferRes.error.message)
  if (consumptionRes.error) throw new Error(consumptionRes.error.message)
  if (movementsRes.error) throw new Error(movementsRes.error.message)
  if (damageRes.error) throw new Error(damageRes.error.message)
  if (skuRes.error) throw new Error(skuRes.error.message)

  const totalStockValue = stockRows.reduce((sum, row) => sum + row.quantity * (costMap.get(row.id) ?? 0), 0)
  const categoryMap = new Map<string, number>()
  for (const row of stockRows) {
    const category = (skuRes.data ?? []).find((sku) => sku.id === row.id)?.category ?? "ไม่ระบุ"
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + row.quantity * (costMap.get(row.id) ?? 0))
  }

  const alerts = await getInventoryAlerts({})
  const expiry7dCount = alerts.filter((alert) => alert.type === "expiry" && (alert.daysLeft ?? 999) <= 7).length
  const belowMinCount = alerts.filter((alert) => alert.type === "low_stock").length

  const inboundValueMtd = (inboundRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.quantity) * Number(row.cost_per_unit ?? 0),
    0
  )
  const consumptionValueMtd = (consumptionRes.data ?? []).reduce(
    (sum, row) => sum + Number(row.qty) * (costMap.get(row.sku_id as string) ?? 0),
    0
  )
  const damageValueMtd = (damageRes.data ?? []).reduce((sum, row) => sum + Number(row.cost_value ?? 0), 0)

  const stockValueTrend = Array.from({ length: 30 }).map((_, index) => {
    const date = addDays(today, index - 29)
    const label = isoDate(date).slice(5)
    const movementDelta = (movementsRes.data ?? [])
      .filter((row) => (row.created_at as string).slice(0, 10) === isoDate(date))
      .reduce((sum, row) => sum + Number(row.quantity), 0)
    return { label, value: Math.max(0, totalStockValue + movementDelta) }
  })

  const inboundVsConsumption = Array.from({ length: 12 }).map((_, index) => {
    const start = addDays(today, -(11 - index) * 7)
    const end = addDays(start, 6)
    const inbound = (inboundRes.data ?? [])
      .filter((row) => {
        const created = (row.created_at as string).slice(0, 10)
        return created >= isoDate(start) && created <= isoDate(end)
      })
      .reduce((sum, row) => sum + Number(row.quantity) * Number(row.cost_per_unit ?? 0), 0)
    const consumption = (consumptionRes.data ?? [])
      .filter((row) => {
        const created = (row.recorded_at as string).slice(0, 10)
        return created >= isoDate(start) && created <= isoDate(end)
      })
      .reduce((sum, row) => sum + Number(row.qty) * (costMap.get(row.sku_id as string) ?? 0), 0)
    return { label: `${isoDate(start).slice(5)}-${isoDate(end).slice(5)}`, inbound, consumption }
  })

  const damageTrend = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (5 - index), 1))
    const monthLabel = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
    const damage = (damageRes.data ?? [])
      .filter((row) => (row.created_at as string).slice(0, 7) === monthLabel)
      .reduce((sum, row) => sum + Number(row.cost_value ?? 0), 0)
    return { label: monthLabel, damage }
  })

  return {
    kpis: {
      totalStockValue,
      skuCount: stockRows.length,
      belowMinCount,
      expiry7dCount,
      inboundValueMtd,
      consumptionValueMtd,
      damageValueMtd,
      pendingRequisitions: reqRes.count ?? 0,
      inTransitTransfers: transferRes.count ?? 0,
      pendingDamageApprovals: damagePendingRes.count ?? 0,
    },
    stockValueTrend,
    inboundVsConsumption,
    damageTrend,
    categoryShare: Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })),
  }
}

export async function getInventoryReport(kind: InventoryReportKind, filters: InventoryReportFilters = {}): Promise<InventoryReportResult> {
  const supabase = await createClient()
  if (kind === "stock") {
    const rows = await listInvStockRows({
      branchId: filters.branchId,
      warehouseId: filters.warehouseId,
    })
    return {
      headers: ["SKU", "Name", "Branch", "Warehouse", "Qty", "Min Stock", "Status"],
      rows: rows.map((row) => [
        row.skuCode,
        row.skuName,
        row.branchName,
        row.warehouseName,
        String(row.quantity),
        String(row.minStock),
        row.belowMin ? "Below Min" : row.quantity === 0 ? "Zero" : "Normal",
      ]),
      summary: `รวม ${rows.length.toLocaleString("th-TH")} รายการ`,
    }
  }

  if (kind === "inbound") {
    const { data, error } = await supabase
      .from("inv_inbound_items")
      .select("quantity, cost_per_unit, lot_number, expiry_date, created_at, inv_skus(code, name), inv_inbound_orders!inner(status, received_date, warehouse_id, supplier_id), inv_warehouses(name), inv_suppliers(name)")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    const rows = (data ?? []).filter((row) => {
      const created = (row.created_at as string).slice(0, 10)
      if (filters.dateFrom && created < filters.dateFrom) return false
      if (filters.dateTo && created > filters.dateTo) return false
      return true
    })
    return {
      headers: ["Date", "Supplier", "Warehouse", "SKU", "Name", "Qty", "Cost", "Lot", "Expiry"],
      rows: rows.map((row) => {
        const inboundOrder = (Array.isArray(row.inv_inbound_orders)
          ? row.inv_inbound_orders[0]
          : row.inv_inbound_orders) as { received_date?: string } | null
        const sku = (Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as
          | { code?: string; name?: string }
          | null
        return [
          formatThaiDate(inboundOrder?.received_date ?? (row.created_at as string)),
          relationName(row.inv_suppliers),
          relationName(row.inv_warehouses),
          sku?.code ?? "—",
          sku?.name ?? "—",
          String(Number(row.quantity)),
          String(Number(row.cost_per_unit ?? 0)),
          (row.lot_number as string | null) ?? "—",
          (row.expiry_date as string | null) ?? "—",
        ]
      }),
      summary: `รวม ${(rows ?? []).length.toLocaleString("th-TH")} แถว`,
    }
  }

  if (kind === "requisition") {
    const { data, error } = await supabase
      .from("inv_requisition_items")
      .select("qty_requested, qty_issued, qty_received, lot_number, inv_requisitions!inner(id, status, created_at, branch_id, requester_id), inv_skus(code, name)")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    const branchNames = (await getBranchWarehouseMaps()).branchNames
    return {
      headers: ["Date", "Req ID", "Branch", "Status", "SKU", "Name", "Requested", "Issued", "Received", "Lot"],
      rows: (data ?? []).map((row) => {
        const req = Array.isArray(row.inv_requisitions) ? row.inv_requisitions[0] : row.inv_requisitions
        const sku = Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus
        return [
          formatThaiDate((req as { created_at?: string } | null)?.created_at ?? ""),
          (req as { id?: string } | null)?.id?.slice(0, 8).toUpperCase() ?? "—",
          branchNames.get((req as { branch_id?: string } | null)?.branch_id ?? "") ?? "—",
          (req as { status?: string } | null)?.status ?? "—",
          (sku as { code?: string } | null)?.code ?? "—",
          (sku as { name?: string } | null)?.name ?? "—",
          String(Number(row.qty_requested)),
          String(Number(row.qty_issued)),
          String(Number(row.qty_received)),
          (row.lot_number as string | null) ?? "—",
        ]
      }),
      summary: `รวม ${(data ?? []).length.toLocaleString("th-TH")} แถว`,
    }
  }

  if (kind === "consumption") {
    const { data, error } = await supabase
      .from("inv_consumptions")
      .select("id, qty, consumption_type, recorded_at, branch_id, warehouse_id, sku_id, inv_skus(code, name)")
      .order("recorded_at", { ascending: false })
    if (error) throw new Error(error.message)
    const { branchNames, warehouseInfo } = await getBranchWarehouseMaps()
    const costMap = await latestCostBySkuIds((data ?? []).map((row) => row.sku_id as string))
    const rows = (data ?? []).map((row) => [
      formatThaiDate(row.recorded_at as string),
      branchNames.get(row.branch_id as string) ?? "—",
      warehouseInfo.get(row.warehouse_id as string)?.name ?? "—",
      ((Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as { code?: string } | null)?.code ?? "—",
      ((Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as { name?: string } | null)?.name ?? "—",
      String(Number(row.qty)),
      row.consumption_type as string,
      String(Number(row.qty) * (costMap.get(row.sku_id as string) ?? 0)),
    ])
    return { headers: ["Date", "Branch", "Warehouse", "SKU", "Name", "Qty", "Type", "Value"], rows, summary: `รวม ${rows.length.toLocaleString("th-TH")} แถว` }
  }

  if (kind === "damage") {
    const { data, error } = await supabase
      .from("inv_damages")
      .select("id, qty, damage_type, status, cost_value, created_at, branch_id, warehouse_id, inv_skus(code, name)")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    const { branchNames, warehouseInfo } = await getBranchWarehouseMaps()
    const rows = (data ?? []).map((row) => [
      formatThaiDate(row.created_at as string),
      branchNames.get(row.branch_id as string) ?? "—",
      warehouseInfo.get(row.warehouse_id as string)?.name ?? "—",
      ((Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as { code?: string } | null)?.code ?? "—",
      ((Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as { name?: string } | null)?.name ?? "—",
      String(Number(row.qty)),
      row.damage_type as string,
      String(Number(row.cost_value ?? 0)),
      row.status as string,
    ])
    return { headers: ["Date", "Branch", "Warehouse", "SKU", "Name", "Qty", "Damage Type", "Value", "Status"], rows, summary: `รวม ${rows.length.toLocaleString("th-TH")} แถว` }
  }

  if (kind === "transfer") {
    const { data, error } = await supabase
      .from("inv_transfer_items")
      .select("qty_sent, qty_received, lot_number, inv_transfers!inner(id, status, created_at, from_branch_id, to_branch_id, from_warehouse_id, to_warehouse_id), inv_skus(code, name)")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    const { branchNames, warehouseInfo } = await getBranchWarehouseMaps()
    const rows = (data ?? []).map((row) => {
      const transfer = Array.isArray(row.inv_transfers) ? row.inv_transfers[0] : row.inv_transfers
      const sku = Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus
      return [
        formatThaiDate((transfer as { created_at?: string } | null)?.created_at ?? ""),
        (transfer as { id?: string } | null)?.id?.slice(0, 8).toUpperCase() ?? "—",
        branchNames.get((transfer as { from_branch_id?: string } | null)?.from_branch_id ?? "") ?? "—",
        branchNames.get((transfer as { to_branch_id?: string } | null)?.to_branch_id ?? "") ?? "—",
        warehouseInfo.get((transfer as { from_warehouse_id?: string } | null)?.from_warehouse_id ?? "")?.name ?? "—",
        warehouseInfo.get((transfer as { to_warehouse_id?: string } | null)?.to_warehouse_id ?? "")?.name ?? "—",
        (sku as { code?: string } | null)?.code ?? "—",
        (sku as { name?: string } | null)?.name ?? "—",
        String(Number(row.qty_sent)),
        String(Number(row.qty_received)),
        (transfer as { status?: string } | null)?.status ?? "—",
        (row.lot_number as string | null) ?? "—",
      ]
    })
    return { headers: ["Date", "Transfer", "From Branch", "To Branch", "From WH", "To WH", "SKU", "Name", "Sent", "Received", "Status", "Lot"], rows, summary: `รวม ${rows.length.toLocaleString("th-TH")} แถว` }
  }

  if (kind === "variance") {
    const { data, error } = await supabase
      .from("inv_stock_count_items")
      .select("system_qty, physical_qty, lot_number, inv_stock_counts!inner(id, status, completed_at, branch_id, warehouse_id), inv_skus(code, name)")
      .eq("inv_stock_counts.status", "completed")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    const { branchNames, warehouseInfo } = await getBranchWarehouseMaps()
    const rows = (data ?? []).map((row) => {
      const count = Array.isArray(row.inv_stock_counts) ? row.inv_stock_counts[0] : row.inv_stock_counts
      const sku = Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus
      const physical = row.physical_qty == null ? null : Number(row.physical_qty)
      const systemQty = Number(row.system_qty)
      return [
        (count as { id?: string } | null)?.id?.slice(0, 8).toUpperCase() ?? "—",
        formatThaiDate((count as { completed_at?: string } | null)?.completed_at ?? ""),
        branchNames.get((count as { branch_id?: string } | null)?.branch_id ?? "") ?? "—",
        warehouseInfo.get((count as { warehouse_id?: string } | null)?.warehouse_id ?? "")?.name ?? "—",
        (sku as { code?: string } | null)?.code ?? "—",
        (sku as { name?: string } | null)?.name ?? "—",
        String(systemQty),
        physical == null ? "—" : String(physical),
        physical == null ? "—" : String(physical - systemQty),
        (row.lot_number as string | null) ?? "—",
      ]
    })
    return { headers: ["Count", "Completed", "Branch", "Warehouse", "SKU", "Name", "System", "Physical", "Variance", "Lot"], rows, summary: rows.length === 0 ? "ยังไม่มีข้อมูล stock count completed" : `รวม ${rows.length.toLocaleString("th-TH")} แถว` }
  }

  const { data, error } = await supabase
    .from("inv_stock_movements")
    .select("created_at, movement_type, quantity, reference_type, reference_id, lot_number, notes, created_by, sku_id, warehouse_id, inv_skus(code, name)")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  const { branchNames, warehouseInfo } = await getBranchWarehouseMaps()
  const employeeMap = new Map<string, string>()
  if ((data ?? []).length > 0) {
    const employeeIds = Array.from(new Set((data ?? []).map((row) => row.created_by as string).filter(Boolean)))
    if (employeeIds.length > 0) {
      const { data: employees } = await supabase.from("hr_employees").select("id, name").in("id", employeeIds)
      for (const emp of employees ?? []) employeeMap.set(emp.id as string, emp.name as string)
    }
  }
  const rows = (data ?? []).map((row) => [
    formatThaiDate(row.created_at as string),
    row.movement_type as string,
    ((Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as { code?: string } | null)?.code ?? "—",
    ((Array.isArray(row.inv_skus) ? row.inv_skus[0] : row.inv_skus) as { name?: string } | null)?.name ?? "—",
    warehouseInfo.get(row.warehouse_id as string)?.name ?? "—",
    branchNames.get(warehouseInfo.get(row.warehouse_id as string)?.branch_id ?? "") ?? "—",
    String(Number(row.quantity)),
    row.reference_type as string,
    (row.reference_id as string | null) ?? "—",
    employeeMap.get(row.created_by as string) ?? "—",
    (row.lot_number as string | null) ?? "—",
    (row.notes as string | null) ?? "—",
  ])
  return { headers: ["Date", "Movement", "SKU", "Name", "Warehouse", "Branch", "Qty", "Ref Type", "Ref ID", "User", "Lot", "Notes"], rows, summary: `รวม ${rows.length.toLocaleString("th-TH")} แถว` }
}
