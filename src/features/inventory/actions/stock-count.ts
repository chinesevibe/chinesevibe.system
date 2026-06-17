"use server"

import { revalidatePath } from "next/cache"

import {
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type {
  InvBranch,
  InventoryActionState,
  InvStockAdjustment,
  InvStockCount,
  InvStockCountItem,
  InvWarehouse,
} from "@/features/inventory/types"
import {
  canManageHr,
  isCeo,
  isDev,
} from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import {
  cancelStockCountSchema,
  createStockCountSchema,
  finalizeStockCountSchema,
  saveStockCountItemsSchema,
  startStockCountSchema,
  stockCountIdSchema,
  type CancelStockCountInput,
  type CreateStockCountInput,
  type FinalizeStockCountInput,
  type SaveStockCountItemsInput,
  type StartStockCountInput,
} from "@/features/inventory/validators/stock-count"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/stock-count"

type NameMap = Map<string, string>

export type InvStockCountCreateOptions = {
  branches: InvBranch[]
  warehouses: Array<InvWarehouse & { branch_name: string }>
}

export type InvStockCountRow = InvStockCount & {
  branch_name: string
  warehouse_name: string
  created_by_name: string
  item_count: number
  counted_count: number
}

export type InvStockCountItemRow = InvStockCountItem & {
  sku_code: string
  sku_name: string
  unit_name: string | null
  unit_abbreviation: string | null
  variance: number | null
  counted_by_name: string | null
}

export type InvStockAdjustmentRow = InvStockAdjustment & {
  sku_code: string
  sku_name: string
  unit_name: string | null
  unit_abbreviation: string | null
}

export type InvStockCountDetail = {
  count: InvStockCountRow
  items: InvStockCountItemRow[]
  adjustments: InvStockAdjustmentRow[]
}

function revalidateStockCount(id?: string) {
  revalidatePath(LIST_PATH)
  if (id) revalidatePath(`${LIST_PATH}/${id}`)
  revalidatePath("/admin/inventory")
  revalidatePath("/admin/inventory/stock")
  revalidatePath("/admin/inventory/reports")
  revalidatePath("/admin/inventory/reports/variance")
}

function mapStockCount(row: Record<string, unknown>): InvStockCount {
  return {
    id: row.id as string,
    branch_id: row.branch_id as string,
    warehouse_id: row.warehouse_id as string,
    scope: row.scope as InvStockCount["scope"],
    status: row.status as InvStockCount["status"],
    planned_at: (row.planned_at as string | null) ?? null,
    started_at: (row.started_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    created_by: row.created_by as string,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

async function getNamesByIds(
  table: "inv_branches" | "inv_warehouses" | "hr_employees",
  ids: string[],
): Promise<NameMap> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map()
  const supabase = await createClient()
  const { data, error } = await supabase.from(table).select("id, name").in("id", uniqueIds)
  if (error) throw new Error(error.message)
  return new Map(((data ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]))
}

function unitFromSkuJoin(row: Record<string, unknown>) {
  const skuRaw = row.inv_skus as unknown
  const skuJoined = Array.isArray(skuRaw) ? skuRaw[0] : skuRaw
  const sku = skuJoined as
    | {
        code?: string
        name?: string
        inv_units?: { name?: string; abbreviation?: string | null } | null
      }
    | null
  const unitRaw = sku?.inv_units as unknown
  const unitJoined = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
  const unit = unitJoined as { name?: string; abbreviation?: string | null } | null
  return {
    sku_code: sku?.code ?? "—",
    sku_name: sku?.name ?? "—",
    unit_name: unit?.name ?? null,
    unit_abbreviation: unit?.abbreviation ?? null,
  }
}

async function countItemsProgress(countIds: string[]) {
  const uniqueIds = Array.from(new Set(countIds.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, { item_count: number; counted_count: number }>()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_stock_count_items")
    .select("count_id, physical_qty")
    .in("count_id", uniqueIds)
  if (error) throw new Error(error.message)
  const counts = new Map<string, { item_count: number; counted_count: number }>()
  for (const row of data ?? []) {
    const countId = row.count_id as string
    const current = counts.get(countId) ?? { item_count: 0, counted_count: 0 }
    current.item_count += 1
    if (row.physical_qty != null) current.counted_count += 1
    counts.set(countId, current)
  }
  return counts
}

async function enrichStockCountRows(rows: InvStockCount[]): Promise<InvStockCountRow[]> {
  if (rows.length === 0) return []
  const [branchNames, warehouseNames, employeeNames, progressMap] = await Promise.all([
    getNamesByIds("inv_branches", rows.map((row) => row.branch_id)),
    getNamesByIds("inv_warehouses", rows.map((row) => row.warehouse_id)),
    getNamesByIds("hr_employees", rows.map((row) => row.created_by)),
    countItemsProgress(rows.map((row) => row.id)),
  ])
  return rows.map((row) => {
    const progress = progressMap.get(row.id) ?? { item_count: 0, counted_count: 0 }
    return {
      ...row,
      branch_name: branchNames.get(row.branch_id) ?? "—",
      warehouse_name: warehouseNames.get(row.warehouse_id) ?? "—",
      created_by_name: employeeNames.get(row.created_by) ?? "—",
      item_count: progress.item_count,
      counted_count: progress.counted_count,
    }
  })
}

function toIctMidnightIso(value: string | undefined) {
  if (!value?.trim()) return null
  return new Date(`${value}T00:00:00+07:00`).toISOString()
}

async function assertStockCountManager() {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    throw new Error("กรุณาเข้าสู่ระบบ")
  }
  if (!canManageHr(employee.role) && !isCeo(employee.role) && !isDev(employee.role)) {
    throw new Error("ไม่มีสิทธิ์จัดการรอบตรวจนับสต๊อก")
  }
  return employee
}

export async function getStockCountCreateOptions(): Promise<InvStockCountCreateOptions> {
  await assertStockCountManager()
  const supabase = await createClient()
  const [branchesResult, warehousesResult] = await Promise.all([
    supabase.from("inv_branches").select("*").eq("is_active", true).order("code", { ascending: true }),
    supabase.from("inv_warehouses").select("*").eq("is_active", true).order("code", { ascending: true }),
  ])
  if (branchesResult.error) throw new Error(branchesResult.error.message)
  if (warehousesResult.error) throw new Error(warehousesResult.error.message)
  const branches = (branchesResult.data ?? []) as InvBranch[]
  const warehouses = (warehousesResult.data ?? []) as InvWarehouse[]
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]))
  return {
    branches,
    warehouses: warehouses.map((warehouse) => ({
      ...warehouse,
      branch_name: branchNames.get(warehouse.branch_id) ?? "—",
    })),
  }
}

export async function listStockCounts(): Promise<InvStockCountRow[]> {
  await assertStockCountManager()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_stock_counts")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return enrichStockCountRows(((data ?? []) as Array<Record<string, unknown>>).map(mapStockCount))
}

export async function getStockCountDetail(id: string): Promise<InvStockCountDetail | null> {
  await assertStockCountManager()
  const parsedId = stockCountIdSchema.parse(id)
  const supabase = await createClient()

  const { data: countRaw, error: countError } = await supabase
    .from("inv_stock_counts")
    .select("*")
    .eq("id", parsedId)
    .maybeSingle()
  if (countError) throw new Error(countError.message)
  if (!countRaw) return null

  const [count] = await enrichStockCountRows([mapStockCount(countRaw as Record<string, unknown>)])

  const [{ data: itemsRaw, error: itemsError }, { data: adjustmentsRaw, error: adjustmentsError }] =
    await Promise.all([
      supabase
        .from("inv_stock_count_items")
        .select("*, inv_skus(code, name, inv_units(name, abbreviation))")
        .eq("count_id", parsedId)
        .order("created_at", { ascending: true }),
      supabase
        .from("inv_stock_adjustments")
        .select("*, inv_skus(code, name, inv_units(name, abbreviation))")
        .eq("count_id", parsedId)
        .order("created_at", { ascending: true }),
    ])
  if (itemsError) throw new Error(itemsError.message)
  if (adjustmentsError) throw new Error(adjustmentsError.message)

  const countedByNames = await getNamesByIds(
    "hr_employees",
    (itemsRaw ?? [])
      .map((row) => row.counted_by as string | null)
      .filter((value): value is string => Boolean(value)),
  )

  const items: InvStockCountItemRow[] = (itemsRaw ?? []).map((row) => {
    const systemQty = Number(row.system_qty)
    const physicalQty = row.physical_qty == null ? null : Number(row.physical_qty)
    return {
      id: row.id as string,
      count_id: row.count_id as string,
      sku_id: row.sku_id as string,
      system_qty: systemQty,
      physical_qty: physicalQty,
      lot_id: (row.lot_id as string | null) ?? null,
      lot_number: (row.lot_number as string | null) ?? null,
      counted_by: (row.counted_by as string | null) ?? null,
      counted_at: (row.counted_at as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      variance: physicalQty == null ? null : physicalQty - systemQty,
      counted_by_name: row.counted_by ? countedByNames.get(row.counted_by as string) ?? "—" : null,
      ...unitFromSkuJoin(row as Record<string, unknown>),
    }
  })

  const adjustments: InvStockAdjustmentRow[] = (adjustmentsRaw ?? []).map((row) => ({
    id: row.id as string,
    count_id: (row.count_id as string | null) ?? null,
    warehouse_id: row.warehouse_id as string,
    sku_id: row.sku_id as string,
    qty_delta: Number(row.qty_delta),
    reason: (row.reason as string | null) ?? null,
    status: row.status as InvStockAdjustment["status"],
    created_by: row.created_by as string,
    applied_at: (row.applied_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    ...unitFromSkuJoin(row as Record<string, unknown>),
  }))

  return { count, items, adjustments }
}

export async function createStockCount(input: CreateStockCountInput): Promise<InventoryActionState> {
  try {
    await assertStockCountManager()
    const payload = createStockCountSchema.parse(input)
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("inv_create_stock_count", {
      p_branch_id: payload.branch_id,
      p_warehouse_id: payload.warehouse_id,
      p_scope: payload.scope,
      p_planned_at: toIctMidnightIso(payload.planned_at),
      p_notes: payload.notes?.trim() || null,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    const countId = data as string
    revalidateStockCount(countId)
    return { success: true, id: countId }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function startStockCount(input: StartStockCountInput): Promise<InventoryActionState> {
  try {
    await assertStockCountManager()
    const payload = startStockCountSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_start_stock_count", {
      p_count_id: payload.count_id,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateStockCount(payload.count_id)
    return { success: true, id: payload.count_id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function saveStockCountItems(input: SaveStockCountItemsInput): Promise<InventoryActionState> {
  try {
    await assertStockCountManager()
    const payload = saveStockCountItemsSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_save_stock_count_items", {
      p_count_id: payload.count_id,
      p_items: payload.items,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateStockCount(payload.count_id)
    return { success: true, id: payload.count_id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function finalizeStockCount(input: FinalizeStockCountInput): Promise<InventoryActionState> {
  try {
    await assertStockCountManager()
    const payload = finalizeStockCountSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_finalize_stock_count", {
      p_count_id: payload.count_id,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateStockCount(payload.count_id)
    return { success: true, id: payload.count_id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function cancelStockCount(input: CancelStockCountInput): Promise<InventoryActionState> {
  try {
    await assertStockCountManager()
    const payload = cancelStockCountSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_cancel_stock_count", {
      p_count_id: payload.count_id,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateStockCount(payload.count_id)
    return { success: true, id: payload.count_id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}
