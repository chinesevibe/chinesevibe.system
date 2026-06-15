"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  assertInventoryOperate,
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type { InventoryActionState } from "@/features/inventory/types"
import type { InvInboundItemRow } from "@/features/inventory/types"
import {
  invInboundItemSchema,
  invInboundOrderSchema,
} from "@/features/inventory/validators/inbound"
import { getAdminClient } from "@/lib/auth/admin-client"
import { getCurrentEmployee } from "@/lib/auth/session"
import type { SkuUnitOption } from "@/lib/inventory/unit-conversion"
import { convertQuantity } from "@/lib/inventory/unit-conversion"
import { getSkuUnitOptions } from "@/lib/inventory/unit-conversion"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/inbound"

function revalidateInbound(orderId?: string) {
  revalidatePath(LIST_PATH)
  if (orderId) revalidatePath(`${LIST_PATH}/${orderId}`)
  revalidatePath("/admin/inventory/stock")
  revalidatePath("/admin/report")
}

async function normalizeInboundQuantity(input: {
  skuId: string
  quantity: number
  unitId?: string | null
  baseUnitId?: string | null
}) {
  const fromUnitId = input.unitId || input.baseUnitId
  if (!fromUnitId || !input.baseUnitId) {
    throw new Error("SKU นี้ยังไม่ได้กำหนดหน่วยฐาน")
  }
  const conversion = await convertQuantity(
    input.skuId,
    input.quantity,
    fromUnitId,
    input.baseUnitId
  )
  return conversion.convertedQuantity
}

export async function createInvInboundOrder(
  formData: FormData
): Promise<InventoryActionState> {
  try {
    const employee = await assertInventoryOperate()
    const payload = invInboundOrderSchema.parse({
      supplier_id: formData.get("supplier_id"),
      warehouse_id: formData.get("warehouse_id"),
      notes: formData.get("notes") || null,
    })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("inv_inbound_orders")
      .insert({
        ...payload,
        status: "pending",
        created_by: employee.id,
      })
      .select("id")
      .single()

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateInbound()
    return { success: true, id: data.id as string }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function createInvInboundOrderAndRedirect(formData: FormData) {
  const result = await createInvInboundOrder(formData)
  if (!result.success || !result.id) {
    throw new Error(result.error ?? "สร้างใบรับเข้าไม่สำเร็จ")
  }
  redirect(`${LIST_PATH}/${result.id}`)
}

export async function addInvInboundItem(
  orderId: string,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const payload = invInboundItemSchema.parse({
      sku_id: formData.get("sku_id"),
      quantity: formData.get("quantity"),
      cost_per_unit: formData.get("cost_per_unit") || null,
      lot_number: formData.get("lot_number") || null,
      expiry_date: formData.get("expiry_date") || null,
    })
    const unitId = formData.get("unit_id")?.toString() || null

    const supabase = await createClient()
    const { data: order, error: orderError } = await supabase
      .from("inv_inbound_orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) return { success: false, error: orderError.message }
    if (!order) return { success: false, error: "ไม่พบใบรับเข้า" }
    if (order.status !== "draft" && order.status !== "pending") {
      return { success: false, error: "ไม่สามารถเพิ่มรายการในสถานะนี้ได้" }
    }

    const { data: sku, error: skuError } = await supabase
      .from("inv_skus")
      .select("unit_id")
      .eq("id", payload.sku_id)
      .maybeSingle()

    if (skuError) return { success: false, error: skuError.message }
    if (!sku) return { success: false, error: "ไม่พบ SKU" }

    const quantity = await normalizeInboundQuantity({
      skuId: payload.sku_id,
      quantity: payload.quantity,
      unitId,
      baseUnitId: sku.unit_id,
    })

    const { error } = await supabase.from("inv_inbound_items").insert({
      inbound_order_id: orderId,
      ...payload,
      quantity,
      cost_per_unit: payload.cost_per_unit ?? null,
      lot_number: payload.lot_number || null,
      expiry_date: payload.expiry_date || null,
    })

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateInbound(orderId)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function submitInvInboundOrder(
  orderId: string
): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const supabase = await createClient()

    const { data: order, error: fetchError } = await supabase
      .from("inv_inbound_orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle()

    if (fetchError) return { success: false, error: fetchError.message }
    if (!order) return { success: false, error: "ไม่พบใบรับเข้า" }
    if (order.status !== "draft") {
      return { success: false, error: "ใบรับเข้านี้เปิดรับสแกนแล้ว" }
    }

    const { error } = await supabase
      .from("inv_inbound_orders")
      .update({ status: "pending" })
      .eq("id", orderId)

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateInbound(orderId)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function approveInvInboundOrder(
  orderId: string
): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const supabase = await createClient()

    const { count, error: countError } = await supabase
      .from("inv_inbound_items")
      .select("id", { count: "exact", head: true })
      .eq("inbound_order_id", orderId)

    if (countError) return { success: false, error: countError.message }
    if (!count) {
      return {
        success: false,
        error: "ยังไม่มีรายการจากสแกน — รอคลังสแกนก่อน Inventory อนุมัติ",
      }
    }

    const { error } = await supabase.rpc("inv_approve_inbound_order", {
      p_order_id: orderId,
    })

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateInbound(orderId)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function cancelInvInboundOrder(
  orderId: string
): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const supabase = await createClient()
    const { error } = await supabase
      .from("inv_inbound_orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .in("status", ["draft", "pending"])

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateInbound(orderId)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function deleteInvInboundItem(
  itemId: string,
  orderId: string
): Promise<InventoryActionState> {
  try {
    await assertInventoryOperate()
    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from("inv_inbound_orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) return { success: false, error: orderError.message }
    if (!order || (order.status !== "draft" && order.status !== "pending")) {
      return { success: false, error: "ไม่สามารถลบรายการในสถานะนี้ได้" }
    }

    const { error } = await supabase
      .from("inv_inbound_items")
      .delete()
      .eq("id", itemId)

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateInbound(orderId)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

async function assertActiveInventoryScanner() {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    throw new Error("กรุณาเข้าสู่ระบบ")
  }
  return employee
}

export async function getInvSkuUnitOptions(input: {
  sku_id: string
}): Promise<{
  success: boolean
  error?: string
  options?: SkuUnitOption[]
}> {
  try {
    await assertActiveInventoryScanner()
    const skuId = input.sku_id.trim()
    if (!skuId) return { success: false, error: "กรุณาเลือก SKU" }

    const options = await getSkuUnitOptions(skuId)
    return { success: true, options }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function getInvSkuUnitOptionsByBarcode(input: {
  barcode: string
}): Promise<{
  success: boolean
  error?: string
  sku?: { id: string; code: string; name: string }
  options?: SkuUnitOption[]
}> {
  try {
    await assertActiveInventoryScanner()
    const barcode = input.barcode.trim()
    if (!barcode) return { success: false, error: "กรุณาระบุ barcode" }

    const supabase = await createClient()
    const { data: sku, error: skuError } = await supabase
      .from("inv_skus")
      .select("id, code, name")
      .eq("barcode", barcode)
      .eq("is_active", true)
      .maybeSingle()

    if (skuError) return { success: false, error: skuError.message }
    if (!sku) return { success: false, error: "ไม่พบ SKU จาก barcode นี้" }

    const options = await getSkuUnitOptions(sku.id as string)
    return {
      success: true,
      sku: {
        id: sku.id as string,
        code: sku.code as string,
        name: sku.name as string,
      },
      options,
    }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function listMobileInvInboundItems(
  orderId: string
): Promise<{
  success: boolean
  error?: string
  items?: InvInboundItemRow[]
}> {
  try {
    await assertActiveInventoryScanner()
    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from("inv_inbound_orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) return { success: false, error: orderError.message }
    if (!order) return { success: false, error: "ไม่พบใบรับเข้า" }

    const { data: items, error: itemsError } = await supabase
      .from("inv_inbound_items")
      .select("*, inv_skus(code, name)")
      .eq("inbound_order_id", orderId)
      .order("created_at", { ascending: false })

    if (itemsError) return { success: false, error: itemsError.message }

    const rows: InvInboundItemRow[] = (items ?? []).map((row) => {
      const skuRaw = row.inv_skus as unknown
      const skuJoined = Array.isArray(skuRaw) ? skuRaw[0] : skuRaw
      const sku = skuJoined as { code?: string; name?: string } | null

      return {
        id: row.id as string,
        inbound_order_id: row.inbound_order_id as string,
        sku_id: row.sku_id as string | null,
        quantity: Number(row.quantity),
        cost_per_unit:
          row.cost_per_unit != null ? Number(row.cost_per_unit) : null,
        lot_number: row.lot_number as string | null,
        expiry_date: row.expiry_date as string | null,
        created_at: row.created_at as string,
        sku_code: sku?.code ?? "—",
        sku_name: sku?.name ?? "—",
      }
    })

    return { success: true, items: rows }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function deleteMobileInvInboundItem(
  itemId: string,
  orderId: string
): Promise<InventoryActionState> {
  try {
    await assertActiveInventoryScanner()
    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from("inv_inbound_orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError) return { success: false, error: orderError.message }
    if (!order || order.status !== "pending") {
      return { success: false, error: "ลบได้เฉพาะใบที่เปิดรับสแกนอยู่" }
    }

    const { error } = await getAdminClient()
      .from("inv_inbound_items")
      .delete()
      .eq("id", itemId)
      .eq("inbound_order_id", orderId)

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateInbound(orderId)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

/** LIFF / API — active employee adds line to pending inbound order */
export async function scanInvInboundItem(input: {
  order_id: string
  barcode: string
  quantity: number
  unit_id?: string | null
  lot_number?: string | null
  expiry_date?: string | null
}): Promise<InventoryActionState> {
  try {
    const employee = await getCurrentEmployee()
    if (!employee || employee.status !== "active") {
      return { success: false, error: "กรุณาเข้าสู่ระบบ" }
    }

    const payload = {
      order_id: input.order_id,
      barcode: input.barcode.trim(),
      quantity: input.quantity,
      unit_id: input.unit_id ?? null,
      lot_number: input.lot_number ?? null,
      expiry_date: input.expiry_date ?? null,
    }

    const supabase = await createClient()

    const { data: order, error: orderError } = await supabase
      .from("inv_inbound_orders")
      .select("status")
      .eq("id", payload.order_id)
      .maybeSingle()

    if (orderError) return { success: false, error: orderError.message }
    if (!order) return { success: false, error: "ไม่พบใบรับเข้า" }
    if (order.status !== "pending") {
      return {
        success: false,
        error: "สแกนได้เฉพาะใบที่เปิดรับสแกนอยู่",
      }
    }

    const { data: sku, error: skuError } = await supabase
      .from("inv_skus")
      .select("id, unit_id")
      .eq("barcode", payload.barcode)
      .eq("is_active", true)
      .maybeSingle()

    if (skuError) return { success: false, error: skuError.message }
    if (!sku) return { success: false, error: "ไม่พบ SKU จาก barcode นี้" }

    const quantity = await normalizeInboundQuantity({
      skuId: sku.id,
      quantity: payload.quantity,
      unitId: payload.unit_id,
      baseUnitId: sku.unit_id,
    })

    const { error } = await getAdminClient().from("inv_inbound_items").insert({
      inbound_order_id: payload.order_id,
      sku_id: sku.id,
      quantity,
      lot_number: payload.lot_number,
      expiry_date: payload.expiry_date || null,
    })

    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidateInbound(payload.order_id)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}
