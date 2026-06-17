"use server"

import { revalidatePath } from "next/cache"

import {
  assertInventoryOperate,
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type {
  InvBranch,
  InventoryActionState,
  InvInventoryCreateOptions,
  InvSku,
  InvWarehouse,
} from "@/features/inventory/types"
import {
  cancelTransferSchema,
  createTransferSchema,
  receiveTransferSchema,
  sendTransferSchema,
  transferIdSchema,
  type CancelTransferInput,
  type CreateTransferInput,
  type ReceiveTransferInput,
  type SendTransferInput,
} from "@/features/inventory/validators/transfer"
import { canAccessInventoryPortal, canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/transfer"

type NameMap = Map<string, string>

export type InvTransferRow = {
  id: string
  from_branch_id: string
  to_branch_id: string
  from_warehouse_id: string
  to_warehouse_id: string
  status: "draft" | "in_transit" | "received" | "cancelled"
  shipper: string | null
  created_by: string
  sent_by: string | null
  received_by: string | null
  sent_at: string | null
  received_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  from_branch_name: string
  to_branch_name: string
  from_warehouse_name: string
  to_warehouse_name: string
  created_by_name: string
  item_count: number
}

export type InvTransferItemRow = {
  id: string
  transfer_id: string
  sku_id: string
  qty_sent: number
  qty_received: number
  lot_id: string | null
  source_lot_id: string | null
  lot_number: string | null
  created_at: string
  updated_at: string
  sku_code: string
  sku_name: string
  unit_name: string | null
  unit_abbreviation: string | null
}

export type InvTransferDetail = {
  transfer: InvTransferRow
  sent_by_name: string | null
  received_by_name: string | null
  items: InvTransferItemRow[]
}

async function assertActiveInventoryEmployee() {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    throw new Error("กรุณาเข้าสู่ระบบ")
  }
  return employee
}

function canManageInventory(employee: Awaited<ReturnType<typeof assertActiveInventoryEmployee>>) {
  return canManageHr(employee.role) || isDev(employee.role) || canAccessInventoryPortal(employee)
}

function canReadAllInventory(employee: Awaited<ReturnType<typeof assertActiveInventoryEmployee>>) {
  return canManageInventory(employee) || isCeo(employee.role)
}

function revalidateTransfer(id?: string) {
  revalidatePath(LIST_PATH)
  if (id) revalidatePath(`${LIST_PATH}/${id}`)
  revalidatePath("/admin/inventory")
  revalidatePath("/admin/inventory/stock")
  revalidatePath("/admin/inventory/dashboard")
  revalidatePath("/admin/inventory/alerts")
  revalidatePath("/admin/inventory/reports")
}

async function getNamesByIds(
  table: "inv_branches" | "inv_warehouses" | "hr_employees",
  ids: string[]
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

function mapTransfer(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    from_branch_id: row.from_branch_id as string,
    to_branch_id: row.to_branch_id as string,
    from_warehouse_id: row.from_warehouse_id as string,
    to_warehouse_id: row.to_warehouse_id as string,
    status: row.status as InvTransferRow["status"],
    shipper: (row.shipper as string | null) ?? null,
    created_by: row.created_by as string,
    sent_by: (row.sent_by as string | null) ?? null,
    received_by: (row.received_by as string | null) ?? null,
    sent_at: (row.sent_at as string | null) ?? null,
    received_at: (row.received_at as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

async function countItemsByTransferIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, number>()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_transfer_items")
    .select("transfer_id")
    .in("transfer_id", uniqueIds)
  if (error) throw new Error(error.message)
  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const id = row.transfer_id as string
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

export async function getTransferCreateOptions(): Promise<InvInventoryCreateOptions> {
  await assertInventoryOperate()
  const supabase = await createClient()
  const [branchesResult, warehousesResult, skusResult] = await Promise.all([
    supabase.from("inv_branches").select("*").eq("is_active", true).order("code", { ascending: true }),
    supabase.from("inv_warehouses").select("*").eq("is_active", true).order("code", { ascending: true }),
    supabase.from("inv_skus").select("*, inv_units(name, abbreviation)").eq("is_active", true).order("code", { ascending: true }),
  ])
  if (branchesResult.error) throw new Error(branchesResult.error.message)
  if (warehousesResult.error) throw new Error(warehousesResult.error.message)
  if (skusResult.error) throw new Error(skusResult.error.message)
  const branches = (branchesResult.data ?? []) as InvBranch[]
  const warehousesRaw = (warehousesResult.data ?? []) as InvWarehouse[]
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]))
  const warehouses = warehousesRaw.map((warehouse) => ({
    ...warehouse,
    branch_name: branchNames.get(warehouse.branch_id) ?? "—",
  }))
  const skus = (skusResult.data ?? []).map((row) => ({
    ...(row as InvSku),
    ...unitFromSkuJoin(row as Record<string, unknown>),
    latest_cost: null,
  }))
  return { branches, warehouses, skus }
}

export async function listTransfers(options?: {
  status?: InvTransferRow["status"]
  branch_id?: string
}): Promise<InvTransferRow[]> {
  const employee = await assertActiveInventoryEmployee()
  const supabase = await createClient()
  let query = supabase.from("inv_transfers").select("*").order("created_at", { ascending: false })
  if (options?.status) query = query.eq("status", options.status)
  if (options?.branch_id) {
    query = query.or(`from_branch_id.eq.${options.branch_id},to_branch_id.eq.${options.branch_id}`)
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  const transfers = ((data ?? []) as Array<Record<string, unknown>>).map(mapTransfer)
  if (!canReadAllInventory(employee)) {
    const own = transfers.filter((row) => row.created_by === employee.id)
    return enrichTransferRows(own)
  }
  return enrichTransferRows(transfers)
}

async function enrichTransferRows(rows: ReturnType<typeof mapTransfer>[]): Promise<InvTransferRow[]> {
  if (rows.length === 0) return []
  const [branchNames, warehouseNames, employeeNames, itemCounts] = await Promise.all([
    getNamesByIds("inv_branches", rows.flatMap((row) => [row.from_branch_id, row.to_branch_id])),
    getNamesByIds("inv_warehouses", rows.flatMap((row) => [row.from_warehouse_id, row.to_warehouse_id])),
    getNamesByIds("hr_employees", rows.map((row) => row.created_by)),
    countItemsByTransferIds(rows.map((row) => row.id)),
  ])
  return rows.map((row) => ({
    ...row,
    from_branch_name: branchNames.get(row.from_branch_id) ?? "—",
    to_branch_name: branchNames.get(row.to_branch_id) ?? "—",
    from_warehouse_name: warehouseNames.get(row.from_warehouse_id) ?? "—",
    to_warehouse_name: warehouseNames.get(row.to_warehouse_id) ?? "—",
    created_by_name: employeeNames.get(row.created_by) ?? "—",
    item_count: itemCounts.get(row.id) ?? 0,
  }))
}

export async function getTransferDetail(id: string): Promise<InvTransferDetail | null> {
  const parsedId = transferIdSchema.parse(id)
  const employee = await assertActiveInventoryEmployee()
  const supabase = await createClient()
  const { data: transferRaw, error: transferError } = await supabase
    .from("inv_transfers")
    .select("*")
    .eq("id", parsedId)
    .maybeSingle()
  if (transferError) throw new Error(transferError.message)
  if (!transferRaw) return null
  const transferBase = mapTransfer(transferRaw as Record<string, unknown>)
  if (!canReadAllInventory(employee) && transferBase.created_by !== employee.id) {
    return null
  }
  const [transfer] = await enrichTransferRows([transferBase])
  const { data: itemsRaw, error: itemsError } = await supabase
    .from("inv_transfer_items")
    .select("*, inv_skus(code, name, inv_units(name, abbreviation))")
    .eq("transfer_id", parsedId)
    .order("created_at", { ascending: true })
  if (itemsError) throw new Error(itemsError.message)
  const items: InvTransferItemRow[] = (itemsRaw ?? []).map((row) => ({
    id: row.id as string,
    transfer_id: row.transfer_id as string,
    sku_id: row.sku_id as string,
    qty_sent: Number(row.qty_sent),
    qty_received: Number(row.qty_received ?? 0),
    lot_id: (row.lot_id as string | null) ?? null,
    source_lot_id: (row.source_lot_id as string | null) ?? null,
    lot_number: (row.lot_number as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    ...unitFromSkuJoin(row as Record<string, unknown>),
  }))
  const employeeNames = await getNamesByIds(
    "hr_employees",
    [transfer.sent_by, transfer.received_by].filter((value): value is string => Boolean(value))
  )
  return {
    transfer,
    sent_by_name: transfer.sent_by ? employeeNames.get(transfer.sent_by) ?? "—" : null,
    received_by_name: transfer.received_by ? employeeNames.get(transfer.received_by) ?? "—" : null,
    items,
  }
}

export async function createTransfer(input: CreateTransferInput): Promise<InventoryActionState> {
  try {
    const employee = await assertInventoryOperate()
    const payload = createTransferSchema.parse(input)
    const supabase = await createClient()
    const { data: transfer, error: transferError } = await supabase
      .from("inv_transfers")
      .insert({
        from_branch_id: payload.from_branch_id,
        to_branch_id: payload.to_branch_id,
        from_warehouse_id: payload.from_warehouse_id,
        to_warehouse_id: payload.to_warehouse_id,
        shipper: payload.shipper?.trim() || null,
        notes: payload.notes?.trim() || null,
        created_by: employee.id,
      })
      .select("id")
      .single()
    if (transferError) return { success: false, error: mapSupabaseInventoryError(transferError) }
    const transferId = transfer.id as string
    const { error: itemsError } = await supabase.from("inv_transfer_items").insert(
      payload.items.map((item) => ({
        transfer_id: transferId,
        sku_id: item.sku_id,
        qty_sent: item.qty_sent,
        qty_received: 0,
        lot_id: item.lot_id ?? null,
        lot_number: item.lot_number?.trim() || null,
      }))
    )
    if (itemsError) return { success: false, error: mapSupabaseInventoryError(itemsError) }
    revalidateTransfer(transferId)
    return { success: true, id: transferId }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function sendTransfer(input: SendTransferInput): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const payload = sendTransferSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_send_transfer", {
      p_transfer_id: payload.transfer_id,
      p_shipper: payload.shipper?.trim() || null,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateTransfer(payload.transfer_id)
    return { success: true, id: payload.transfer_id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function receiveTransfer(input: ReceiveTransferInput): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const payload = receiveTransferSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_receive_transfer", {
      p_transfer_id: payload.transfer_id,
      p_items: payload.items,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateTransfer(payload.transfer_id)
    return { success: true, id: payload.transfer_id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function cancelTransfer(input: CancelTransferInput): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const payload = cancelTransferSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_cancel_transfer", {
      p_transfer_id: payload.transfer_id,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateTransfer(payload.transfer_id)
    return { success: true, id: payload.transfer_id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}
