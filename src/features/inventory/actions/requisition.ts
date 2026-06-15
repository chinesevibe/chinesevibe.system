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
  InvRequisition,
  InvRequisitionCreateOptions,
  InvRequisitionDetail,
  InvRequisitionItemRow,
  InvRequisitionRow,
  InvRequisitionStatus,
  InvSku,
  InvWarehouse,
} from "@/features/inventory/types"
import {
  invRequisitionApproveSchema,
  invRequisitionCreateSchema,
  invRequisitionIdSchema,
  invRequisitionIssueSchema,
  invRequisitionReceiveSchema,
  invRequisitionRejectSchema,
  type InvRequisitionApproveInput,
  type InvRequisitionCreateInput,
  type InvRequisitionIssueInput,
  type InvRequisitionReceiveInput,
  type InvRequisitionRejectInput,
} from "@/features/inventory/validators/requisition"
import {
  canAccessInventoryPortal,
  canManageHr,
  isCeo,
  isDev,
} from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/requisition"

type NameMap = Map<string, string>

function revalidateRequisition(id?: string) {
  revalidatePath(LIST_PATH)
  if (id) revalidatePath(`${LIST_PATH}/${id}`)
  revalidatePath("/admin/inventory/stock")
  revalidatePath("/admin/report")
}

function canManageInventory(employee: Awaited<ReturnType<typeof assertActiveInventoryEmployee>>) {
  return canManageHr(employee.role) || isDev(employee.role) || canAccessInventoryPortal(employee)
}

function canReadAllInventory(employee: Awaited<ReturnType<typeof assertActiveInventoryEmployee>>) {
  return canManageInventory(employee) || isCeo(employee.role)
}

async function assertActiveInventoryEmployee() {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    throw new Error("กรุณาเข้าสู่ระบบ")
  }
  return employee
}

async function getNamesByIds(
  table: "inv_branches" | "inv_warehouses" | "hr_employees",
  ids: string[]
): Promise<NameMap> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from(table)
    .select("id, name")
    .in("id", uniqueIds)

  if (error) throw new Error(error.message)
  return new Map(
    ((data ?? []) as Array<{ id: string; name: string }>).map((row) => [
      row.id,
      row.name,
    ])
  )
}

async function countItemsByRequisitionIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)))
  if (uniqueIds.length === 0) return new Map<string, number>()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_requisition_items")
    .select("requisition_id")
    .in("requisition_id", uniqueIds)

  if (error) throw new Error(error.message)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    const requisitionId = row.requisition_id as string
    counts.set(requisitionId, (counts.get(requisitionId) ?? 0) + 1)
  }
  return counts
}

function mapRequisition(row: Record<string, unknown>): InvRequisition {
  return {
    id: row.id as string,
    branch_id: row.branch_id as string,
    warehouse_id: row.warehouse_id as string,
    requester_id: row.requester_id as string,
    status: row.status as InvRequisitionStatus,
    notes: row.notes as string | null,
    rejection_reason: row.rejection_reason as string | null,
    approved_by: row.approved_by as string | null,
    approved_at: row.approved_at as string | null,
    issued_by: row.issued_by as string | null,
    issued_at: row.issued_at as string | null,
    received_by: row.received_by as string | null,
    received_at: row.received_at as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function listInvRequisitions(options?: {
  status?: InvRequisitionStatus
  branch_id?: string
}): Promise<InvRequisitionRow[]> {
  const employee = await assertActiveInventoryEmployee()
  const supabase = await createClient()
  let query = supabase
    .from("inv_requisitions")
    .select("*")
    .order("created_at", { ascending: false })

  if (!canReadAllInventory(employee)) {
    query = query.eq("requester_id", employee.id)
  }
  if (options?.status) query = query.eq("status", options.status)
  if (options?.branch_id) query = query.eq("branch_id", options.branch_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const requisitions = ((data ?? []) as Array<Record<string, unknown>>).map(
    mapRequisition
  )
  const [branchNames, warehouseNames, requesterNames, itemCounts] =
    await Promise.all([
      getNamesByIds("inv_branches", requisitions.map((row) => row.branch_id)),
      getNamesByIds(
        "inv_warehouses",
        requisitions.map((row) => row.warehouse_id)
      ),
      getNamesByIds("hr_employees", requisitions.map((row) => row.requester_id)),
      countItemsByRequisitionIds(requisitions.map((row) => row.id)),
    ])

  return requisitions.map((row) => ({
    ...row,
    branch_name: branchNames.get(row.branch_id) ?? "—",
    warehouse_name: warehouseNames.get(row.warehouse_id) ?? "—",
    requester_name: requesterNames.get(row.requester_id) ?? "—",
    item_count: itemCounts.get(row.id) ?? 0,
  }))
}

export async function getInvRequisitionDetail(
  id: string
): Promise<InvRequisitionDetail | null> {
  const parsedId = invRequisitionIdSchema.parse(id)
  const employee = await assertActiveInventoryEmployee()
  const supabase = await createClient()

  const { data: requisitionRaw, error: requisitionError } = await supabase
    .from("inv_requisitions")
    .select("*")
    .eq("id", parsedId)
    .maybeSingle()

  if (requisitionError) throw new Error(requisitionError.message)
  if (!requisitionRaw) return null

  const requisition = mapRequisition(requisitionRaw as Record<string, unknown>)
  if (
    !canReadAllInventory(employee) &&
    requisition.requester_id !== employee.id
  ) {
    return null
  }

  const { data: itemsRaw, error: itemsError } = await supabase
    .from("inv_requisition_items")
    .select("*, inv_skus(code, name, unit_id, inv_units(name, abbreviation))")
    .eq("requisition_id", parsedId)
    .order("created_at", { ascending: true })

  if (itemsError) throw new Error(itemsError.message)

  const employeeIds = [
    requisition.requester_id,
    requisition.approved_by,
    requisition.issued_by,
    requisition.received_by,
  ].filter((value): value is string => Boolean(value))

  const [branchNames, warehouseNames, employeeNames] = await Promise.all([
    getNamesByIds("inv_branches", [requisition.branch_id]),
    getNamesByIds("inv_warehouses", [requisition.warehouse_id]),
    getNamesByIds("hr_employees", employeeIds),
  ])

  const items: InvRequisitionItemRow[] = (itemsRaw ?? []).map((row) => {
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
    const unit = unitJoined as
      | { name?: string; abbreviation?: string | null }
      | null

    return {
      id: row.id as string,
      requisition_id: row.requisition_id as string,
      sku_id: row.sku_id as string,
      qty_requested: Number(row.qty_requested),
      qty_approved: Number(row.qty_approved ?? 0),
      qty_issued: Number(row.qty_issued ?? 0),
      qty_received: Number(row.qty_received ?? 0),
      lot_number: row.lot_number as string | null,
      notes: row.notes as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      sku_code: sku?.code ?? "—",
      sku_name: sku?.name ?? "—",
      unit_name: unit?.name ?? null,
      unit_abbreviation: unit?.abbreviation ?? null,
    }
  })

  return {
    requisition,
    branch_name: branchNames.get(requisition.branch_id) ?? "—",
    warehouse_name: warehouseNames.get(requisition.warehouse_id) ?? "—",
    requester_name: employeeNames.get(requisition.requester_id) ?? "—",
    approved_by_name: requisition.approved_by
      ? employeeNames.get(requisition.approved_by) ?? null
      : null,
    issued_by_name: requisition.issued_by
      ? employeeNames.get(requisition.issued_by) ?? null
      : null,
    received_by_name: requisition.received_by
      ? employeeNames.get(requisition.received_by) ?? null
      : null,
    items,
  }
}

export async function getInvRequisitionCreateOptions(): Promise<InvRequisitionCreateOptions> {
  await assertActiveInventoryEmployee()
  const supabase = await createClient()

  const [branchesResult, warehousesResult, skusResult] = await Promise.all([
    supabase
      .from("inv_branches")
      .select("*")
      .eq("is_active", true)
      .order("code", { ascending: true }),
    supabase
      .from("inv_warehouses")
      .select("*")
      .eq("is_active", true)
      .order("code", { ascending: true }),
    supabase
      .from("inv_skus")
      .select("*, inv_units(name, abbreviation)")
      .eq("is_active", true)
      .order("code", { ascending: true }),
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
  const skus = (skusResult.data ?? []).map((row) => {
    const unitRaw = row.inv_units as unknown
    const unitJoined = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
    const unit = unitJoined as
      | { name?: string; abbreviation?: string | null }
      | null

    return {
      ...(row as InvSku),
      unit_name: unit?.name ?? null,
      unit_abbreviation: unit?.abbreviation ?? null,
    }
  })

  return { branches, warehouses, skus }
}

export async function createRequisition(
  input: InvRequisitionCreateInput
): Promise<InventoryActionState> {
  try {
    const employee = await assertActiveInventoryEmployee()
    const payload = invRequisitionCreateSchema.parse(input)
    const supabase = await createClient()

    const skuIds = Array.from(new Set(payload.items.map((item) => item.sku_id)))
    const { data: activeSkus, error: skuError } = await supabase
      .from("inv_skus")
      .select("id")
      .in("id", skuIds)
      .eq("is_active", true)

    if (skuError) return { success: false, error: skuError.message }
    if ((activeSkus ?? []).length !== skuIds.length) {
      return { success: false, error: "มี SKU ที่ไม่พร้อมใช้งาน" }
    }

    const { data: requisition, error: requisitionError } = await supabase
      .from("inv_requisitions")
      .insert({
        branch_id: payload.branch_id,
        warehouse_id: payload.warehouse_id,
        requester_id: employee.id,
        status: "draft",
        notes: payload.notes ?? null,
      })
      .select("id")
      .single()

    if (requisitionError) {
      return {
        success: false,
        error: mapSupabaseInventoryError(requisitionError),
      }
    }

    const requisitionId = requisition.id as string
    const { error: itemsError } = await supabase
      .from("inv_requisition_items")
      .insert(
        payload.items.map((item) => ({
          requisition_id: requisitionId,
          sku_id: item.sku_id,
          qty_requested: item.qty_requested,
          notes: item.notes ?? null,
        }))
      )

    if (itemsError) {
      return { success: false, error: mapSupabaseInventoryError(itemsError) }
    }

    revalidateRequisition(requisitionId)
    return { success: true, id: requisitionId }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function submitRequisition(
  id: string
): Promise<InventoryActionState> {
  try {
    const requisitionId = invRequisitionIdSchema.parse(id)
    const employee = await assertActiveInventoryEmployee()
    const supabase = await createClient()

    const { data: requisition, error: requisitionError } = await supabase
      .from("inv_requisitions")
      .select("requester_id, status")
      .eq("id", requisitionId)
      .maybeSingle()

    if (requisitionError) return { success: false, error: requisitionError.message }
    if (!requisition) return { success: false, error: "ไม่พบใบเบิก" }
    if (
      requisition.requester_id !== employee.id &&
      !canManageInventory(employee)
    ) {
      return { success: false, error: "ไม่มีสิทธิ์ส่งใบเบิกนี้" }
    }
    if (requisition.status !== "draft") {
      return { success: false, error: "ส่งได้เฉพาะใบเบิกแบบร่าง" }
    }

    const { count, error: countError } = await supabase
      .from("inv_requisition_items")
      .select("id", { count: "exact", head: true })
      .eq("requisition_id", requisitionId)

    if (countError) return { success: false, error: countError.message }
    if (!count) return { success: false, error: "ต้องมีรายการเบิกอย่างน้อย 1 รายการ" }

    const { error } = await supabase
      .from("inv_requisitions")
      .update({ status: "pending" })
      .eq("id", requisitionId)
      .eq("status", "draft")

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateRequisition(requisitionId)
    return { success: true, id: requisitionId }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function approveRequisition(
  input: InvRequisitionApproveInput
): Promise<InventoryActionState> {
  try {
    const employee = await assertInventoryOperate()
    const payload = invRequisitionApproveSchema.parse(input)
    const supabase = await createClient()

    const { data: requisition, error: requisitionError } = await supabase
      .from("inv_requisitions")
      .select("status")
      .eq("id", payload.id)
      .maybeSingle()

    if (requisitionError) return { success: false, error: requisitionError.message }
    if (!requisition) return { success: false, error: "ไม่พบใบเบิก" }
    if (requisition.status !== "pending") {
      return { success: false, error: "อนุมัติได้เฉพาะใบเบิกที่รออนุมัติ" }
    }

    const { data: items, error: itemsError } = await supabase
      .from("inv_requisition_items")
      .select("id, qty_requested")
      .eq("requisition_id", payload.id)

    if (itemsError) return { success: false, error: itemsError.message }

    const requestedById = new Map(
      (items ?? []).map((item) => [item.id as string, Number(item.qty_requested)])
    )
    if (requestedById.size !== payload.items.length) {
      return { success: false, error: "กรุณาระบุจำนวนอนุมัติให้ครบทุกรายการ" }
    }

    let approvedTotal = 0
    for (const item of payload.items) {
      const requested = requestedById.get(item.id)
      if (requested == null) return { success: false, error: "รายการอนุมัติไม่ถูกต้อง" }
      if (item.qty_approved > requested) {
        return { success: false, error: "จำนวนอนุมัติเกินจำนวนที่ขอ" }
      }
      approvedTotal += item.qty_approved
    }
    if (approvedTotal <= 0) {
      return { success: false, error: "ถ้าไม่อนุมัติทุกรายการ ให้ใช้ปุ่ม Reject" }
    }

    for (const item of payload.items) {
      const { error } = await supabase
        .from("inv_requisition_items")
        .update({ qty_approved: item.qty_approved })
        .eq("id", item.id)
        .eq("requisition_id", payload.id)

      if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    }

    const { error } = await supabase
      .from("inv_requisitions")
      .update({
        status: "approved",
        approved_by: employee.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .eq("status", "pending")

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateRequisition(payload.id)
    return { success: true, id: payload.id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function rejectRequisition(
  input: InvRequisitionRejectInput
): Promise<InventoryActionState> {
  try {
    const employee = await assertInventoryOperate()
    const payload = invRequisitionRejectSchema.parse(input)
    const supabase = await createClient()

    const { error } = await supabase
      .from("inv_requisitions")
      .update({
        status: "rejected",
        rejection_reason: payload.reason,
        approved_by: employee.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .eq("status", "pending")

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateRequisition(payload.id)
    return { success: true, id: payload.id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function issueRequisition(
  input: InvRequisitionIssueInput
): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const payload = invRequisitionIssueSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_issue_requisition", {
      p_requisition_id: payload.id,
      p_items: payload.items,
    })

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateRequisition(payload.id)
    return { success: true, id: payload.id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function receiveRequisition(
  input: InvRequisitionReceiveInput
): Promise<InventoryActionState> {
  try {
    const employee = await assertActiveInventoryEmployee()
    const payload = invRequisitionReceiveSchema.parse(input)
    const supabase = await createClient()

    const { data: requisition, error: requisitionError } = await supabase
      .from("inv_requisitions")
      .select("requester_id, status")
      .eq("id", payload.id)
      .maybeSingle()

    if (requisitionError) return { success: false, error: requisitionError.message }
    if (!requisition) return { success: false, error: "ไม่พบใบเบิก" }
    if (
      requisition.requester_id !== employee.id &&
      !canManageInventory(employee)
    ) {
      return { success: false, error: "ไม่มีสิทธิ์รับสินค้าของใบเบิกนี้" }
    }
    if (requisition.status !== "issued") {
      return { success: false, error: "รับสินค้าได้เฉพาะใบที่จ่ายของแล้ว" }
    }

    const { data: items, error: itemsError } = await supabase
      .from("inv_requisition_items")
      .select("id, qty_issued")
      .eq("requisition_id", payload.id)
      .gt("qty_issued", 0)

    if (itemsError) return { success: false, error: itemsError.message }

    const issuedById = new Map(
      (items ?? []).map((item) => [item.id as string, Number(item.qty_issued)])
    )
    if (issuedById.size !== payload.items.length) {
      return { success: false, error: "กรุณาระบุจำนวนรับให้ครบทุกรายการที่จ่าย" }
    }

    for (const item of payload.items) {
      const issued = issuedById.get(item.id)
      if (issued == null) return { success: false, error: "รายการรับไม่ถูกต้อง" }
      if (item.qty_received > issued) {
        return { success: false, error: "จำนวนรับเกินจำนวนที่จ่าย" }
      }
    }

    for (const item of payload.items) {
      const { error } = await supabase
        .from("inv_requisition_items")
        .update({ qty_received: item.qty_received })
        .eq("id", item.id)
        .eq("requisition_id", payload.id)

      if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    }

    const { error } = await supabase
      .from("inv_requisitions")
      .update({
        status: "completed",
        received_by: employee.id,
        received_at: new Date().toISOString(),
      })
      .eq("id", payload.id)
      .eq("status", "issued")

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateRequisition(payload.id)
    return { success: true, id: payload.id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}
