"use server"

import { revalidatePath } from "next/cache"

import {
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type {
  InvBranch,
  InvDamage,
  InvDamageDetail,
  InvDamageRow,
  InvDamageStatus,
  InvInventoryCreateOptions,
  InventoryActionState,
  InventoryMultiActionState,
  InvSku,
  InvWarehouse,
} from "@/features/inventory/types"
import {
  approveDamageSchema,
  createDamageReportSchema,
  invDamageIdSchema,
  listDamageReportsSchema,
  recordConsumptionSchema,
  rejectDamageSchema,
  uploadDamagePhotoSchema,
  type ApproveDamageInput,
  type CreateDamageReportInput,
  type ListDamageReportsInput,
  type RecordConsumptionInput,
  type RejectDamageInput,
} from "@/features/inventory/validators/consumption"
import { canAccessInventoryPortal, canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

const CONSUMPTION_PATH = "/admin/inventory/consumption"
const DAMAGE_PATH = "/admin/inventory/damage"
const DAMAGE_BUCKET = "inventory-damage-photos"
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

type NameMap = Map<string, string>

function revalidateConsumptionDamage(id?: string) {
  revalidatePath(CONSUMPTION_PATH)
  revalidatePath(DAMAGE_PATH)
  revalidatePath("/admin/inventory/stock")
  revalidatePath("/admin/report")
  if (id) revalidatePath(`${DAMAGE_PATH}/${id}`)
}

function canReadAllInventory(employee: Awaited<ReturnType<typeof assertActiveInventoryEmployee>>) {
  return (
    canManageHr(employee.role) ||
    isDev(employee.role) ||
    isCeo(employee.role) ||
    canAccessInventoryPortal(employee)
  )
}

function canApproveDamageRole(employee: Awaited<ReturnType<typeof assertActiveInventoryEmployee>>) {
  return canManageHr(employee.role) || isDev(employee.role) || canAccessInventoryPortal(employee)
}

function canApproveAdminDamageRole(role: Parameters<typeof canManageHr>[0]) {
  return role === "admin" || isDev(role)
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

function unitFromSkuJoin(row: Record<string, unknown>) {
  const unitRaw = row.inv_units as unknown
  const unitJoined = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
  const unit = unitJoined as
    | { name?: string; abbreviation?: string | null }
    | null

  return {
    unit_name: unit?.name ?? null,
    unit_abbreviation: unit?.abbreviation ?? null,
  }
}

async function latestCostBySkuIds(skuIds: string[]) {
  const supabase = await createClient()
  const entries = await Promise.all(
    skuIds.map(async (skuId) => {
      const { data, error } = await supabase.rpc("inv_latest_sku_cost", {
        p_sku_id: skuId,
      })
      if (error) throw new Error(error.message)
      return [skuId, data == null ? null : Number(data)] as const
    })
  )
  return new Map(entries)
}

export async function getConsumptionCreateOptions(): Promise<InvInventoryCreateOptions> {
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
  const costs = await latestCostBySkuIds(
    (skusResult.data ?? []).map((row) => row.id as string)
  )
  const warehouses = warehousesRaw.map((warehouse) => ({
    ...warehouse,
    branch_name: branchNames.get(warehouse.branch_id) ?? "—",
  }))
  const skus = (skusResult.data ?? []).map((row) => ({
    ...(row as InvSku),
    ...unitFromSkuJoin(row as Record<string, unknown>),
    latest_cost: costs.get(row.id as string) ?? null,
  }))

  return { branches, warehouses, skus }
}

export async function getDamageCreateOptions(): Promise<InvInventoryCreateOptions> {
  return getConsumptionCreateOptions()
}

export async function recordConsumption(
  input: RecordConsumptionInput
): Promise<InventoryMultiActionState> {
  try {
    await assertActiveInventoryEmployee()
    const payload = recordConsumptionSchema.parse(input)
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("inv_record_consumption", {
      p_branch_id: payload.branch_id,
      p_warehouse_id: payload.warehouse_id,
      p_items: payload.items,
      p_notes: payload.notes ?? null,
    })

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    const ids = Array.isArray(data) ? (data as string[]) : []
    revalidateConsumptionDamage()
    return { success: true, id: ids[0], ids }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

function mapDamage(row: Record<string, unknown>): InvDamage {
  return {
    id: row.id as string,
    branch_id: row.branch_id as string,
    warehouse_id: row.warehouse_id as string,
    sku_id: row.sku_id as string,
    qty: Number(row.qty),
    damage_type: row.damage_type as InvDamage["damage_type"],
    reason: row.reason as string,
    photo_url: row.photo_url as string | null,
    status: row.status as InvDamageStatus,
    cost_value: Number(row.cost_value),
    approval_required_role:
      row.approval_required_role as InvDamage["approval_required_role"],
    auto_approved: Boolean(row.auto_approved),
    approver_id: row.approver_id as string | null,
    approved_at: row.approved_at as string | null,
    rejected_at: row.rejected_at as string | null,
    rejection_reason: row.rejection_reason as string | null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    notes: row.notes as string | null,
  }
}

async function enrichDamageRows(rows: InvDamage[]): Promise<InvDamageRow[]> {
  if (rows.length === 0) return []
  const supabase = await createClient()
  const skuIds = rows.map((row) => row.sku_id)
  const employeeIds = rows
    .flatMap((row) => [row.created_by, row.approver_id])
    .filter((value): value is string => Boolean(value))

  const [branchNames, warehouseNames, employeeNames, skuResult] =
    await Promise.all([
      getNamesByIds("inv_branches", rows.map((row) => row.branch_id)),
      getNamesByIds("inv_warehouses", rows.map((row) => row.warehouse_id)),
      getNamesByIds("hr_employees", employeeIds),
      supabase
        .from("inv_skus")
        .select("id, code, name, inv_units(name, abbreviation)")
        .in("id", Array.from(new Set(skuIds))),
    ])

  if (skuResult.error) throw new Error(skuResult.error.message)

  const skuById = new Map(
    (skuResult.data ?? []).map((row) => {
      const unit = unitFromSkuJoin(row as Record<string, unknown>)
      return [
        row.id as string,
        {
          code: row.code as string,
          name: row.name as string,
          ...unit,
        },
      ]
    })
  )

  return rows.map((row) => {
    const sku = skuById.get(row.sku_id)
    return {
      ...row,
      branch_name: branchNames.get(row.branch_id) ?? "—",
      warehouse_name: warehouseNames.get(row.warehouse_id) ?? "—",
      sku_code: sku?.code ?? "—",
      sku_name: sku?.name ?? "—",
      unit_name: sku?.unit_name ?? null,
      unit_abbreviation: sku?.unit_abbreviation ?? null,
      created_by_name: employeeNames.get(row.created_by) ?? "—",
      approver_name: row.approver_id
        ? employeeNames.get(row.approver_id) ?? null
        : null,
    }
  })
}

export async function listDamageReports(
  options?: ListDamageReportsInput
): Promise<InvDamageRow[]> {
  const employee = await assertActiveInventoryEmployee()
  const payload = listDamageReportsSchema.parse(options ?? {})
  const supabase = await createClient()
  let query = supabase
    .from("inv_damages")
    .select("*")
    .order("created_at", { ascending: false })

  if (!canReadAllInventory(employee)) {
    query = query.eq("created_by", employee.id)
  }
  if (payload.status) query = query.eq("status", payload.status)
  if (payload.branch_id) query = query.eq("branch_id", payload.branch_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return enrichDamageRows(
    ((data ?? []) as Array<Record<string, unknown>>).map(mapDamage)
  )
}

export async function getDamageReportDetail(
  id: string
): Promise<InvDamageDetail | null> {
  const damageId = invDamageIdSchema.parse(id)
  const employee = await assertActiveInventoryEmployee()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_damages")
    .select("*")
    .eq("id", damageId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const damage = mapDamage(data as Record<string, unknown>)
  if (!canReadAllInventory(employee) && damage.created_by !== employee.id) {
    return null
  }

  const [row] = await enrichDamageRows([damage])
  let photoSignedUrl: string | null = null
  if (damage.photo_url) {
    const { data: signed } = await supabase.storage
      .from(DAMAGE_BUCKET)
      .createSignedUrl(damage.photo_url, 60 * 10)
    photoSignedUrl = signed?.signedUrl ?? null
  }

  return { ...row, photo_signed_url: photoSignedUrl }
}

function approvalRoleForCost(costValue: number) {
  if (costValue <= 500) return "auto" as const
  if (costValue > 5000) return "admin" as const
  return "hr" as const
}

export async function createDamageReport(
  input: CreateDamageReportInput
): Promise<InventoryMultiActionState> {
  try {
    const employee = await assertActiveInventoryEmployee()
    const payload = createDamageReportSchema.parse(input)
    const supabase = await createClient()
    const skuIds = Array.from(new Set(payload.items.map((item) => item.sku_id)))
    const costs = await latestCostBySkuIds(skuIds)

    const rows = payload.items.map((item) => {
      const unitCost = costs.get(item.sku_id)
      if (unitCost == null) {
        throw new Error("ไม่พบต้นทุนล่าสุดของ SKU นี้ กรุณารับเข้าพร้อมต้นทุนก่อน")
      }
      const costValue = item.qty * unitCost
      const approvalRole = approvalRoleForCost(costValue)
      return {
        branch_id: payload.branch_id,
        warehouse_id: payload.warehouse_id,
        sku_id: item.sku_id,
        qty: item.qty,
        damage_type: item.damage_type,
        reason: item.reason,
        photo_url: item.photo_url ?? null,
        status: "pending",
        cost_value: costValue,
        approval_required_role: approvalRole,
        auto_approved: approvalRole === "auto",
        created_by: employee.id,
        notes: item.notes ?? payload.notes ?? null,
      }
    })

    const { data: inserted, error: insertError } = await supabase
      .from("inv_damages")
      .insert(rows)
      .select("id, approval_required_role")

    if (insertError) {
      return { success: false, error: mapSupabaseInventoryError(insertError) }
    }

    const insertedRows = (inserted ?? []) as Array<{
      id: string
      approval_required_role: "auto" | "hr" | "admin"
    }>
    for (const row of insertedRows) {
      if (row.approval_required_role !== "auto") continue
      const { error } = await supabase.rpc("inv_approve_damage", {
        p_damage_id: row.id,
      })
      if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    }

    const ids = insertedRows.map((row) => row.id)
    const { data: statusRows } = await supabase
      .from("inv_damages")
      .select("id, status")
      .in("id", ids)

    const statuses = (statusRows ?? []).map(
      (row) => row.status as InvDamageStatus
    )
    revalidateConsumptionDamage(ids[0])
    return {
      success: true,
      id: ids[0],
      ids,
      statuses,
      autoApproved: statuses.some((status) => status === "approved"),
      autoApprovedCount: statuses.filter((status) => status === "approved")
        .length,
      pendingCount: statuses.filter((status) => status === "pending").length,
    }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function approveDamage(
  input: ApproveDamageInput
): Promise<InventoryActionState> {
  try {
    const employee = await assertActiveInventoryEmployee()
    if (!canApproveDamageRole(employee)) {
      return { success: false, error: "ไม่มีสิทธิ์อนุมัติรายงานความเสียหาย" }
    }
    const payload = approveDamageSchema.parse(input)
    const detail = await getDamageReportDetail(payload.id)
    if (!detail) return { success: false, error: "ไม่พบรายงานความเสียหาย" }
    if (
      detail.approval_required_role === "admin" &&
      !canApproveAdminDamageRole(employee.role)
    ) {
      return { success: false, error: "ต้องใช้สิทธิ์ Admin เพื่ออนุมัติรายการนี้" }
    }

    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_approve_damage", {
      p_damage_id: payload.id,
    })

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateConsumptionDamage(payload.id)
    return { success: true, id: payload.id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function rejectDamage(
  input: RejectDamageInput
): Promise<InventoryActionState> {
  try {
    const employee = await assertActiveInventoryEmployee()
    if (!canApproveDamageRole(employee)) {
      return { success: false, error: "ไม่มีสิทธิ์ปฏิเสธรายงานความเสียหาย" }
    }
    const payload = rejectDamageSchema.parse(input)
    const detail = await getDamageReportDetail(payload.id)
    if (!detail) return { success: false, error: "ไม่พบรายงานความเสียหาย" }
    if (
      detail.approval_required_role === "admin" &&
      !canApproveAdminDamageRole(employee.role)
    ) {
      return { success: false, error: "ต้องใช้สิทธิ์ Admin เพื่อปฏิเสธรายการนี้" }
    }

    const supabase = await createClient()
    const { error } = await supabase.rpc("inv_reject_damage", {
      p_damage_id: payload.id,
      p_rejection_reason: payload.reason,
    })

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateConsumptionDamage(payload.id)
    return { success: true, id: payload.id }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

function sanitizeFilename(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "jpg"
  const base = name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return `${base || "damage-photo"}.${ext}`
}

export async function uploadDamagePhoto(
  formData: FormData
): Promise<InventoryActionState> {
  try {
    const employee = await assertActiveInventoryEmployee()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return { success: false, error: "กรุณาเลือกรูปภาพ" }
    }

    const metadata = uploadDamagePhotoSchema.parse({
      filename: file.name,
      content_type: file.type,
      size: file.size,
    })
    if (!ALLOWED_PHOTO_TYPES.has(metadata.content_type)) {
      return { success: false, error: "รองรับเฉพาะ JPG, PNG, WEBP" }
    }
    if (file.size > MAX_PHOTO_SIZE) {
      return { success: false, error: "รูปภาพต้องไม่เกิน 5MB" }
    }

    const supabase = await createClient()
    const path = `${employee.id}/pending/${crypto.randomUUID()}-${sanitizeFilename(
      metadata.filename
    )}`
    const { error } = await supabase.storage
      .from(DAMAGE_BUCKET)
      .upload(path, file, {
        contentType: metadata.content_type,
        upsert: false,
      })

    if (error) return { success: false, error: error.message }
    return { success: true, id: path }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}
