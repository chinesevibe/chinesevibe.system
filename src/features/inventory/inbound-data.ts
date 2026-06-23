import type {
  InvInboundItemRow,
  InvInboundOrder,
  InvInboundOrderRow,
  InvInboundStatus,
} from "@/features/inventory/types"
import {
  formatInventoryBarcodeConflict,
  normalizeInventoryBarcode,
} from "@/lib/inventory/barcode"
import { createClient } from "@/lib/supabase/server"

const NO_SUPPLIER_LABEL = "ไม่ระบุผู้จำหน่าย"

function relationName(value: unknown): string {
  if (!value) return "—"
  if (Array.isArray(value)) {
    const first = value[0] as { name?: string } | undefined
    return first?.name ?? "—"
  }
  return (value as { name?: string }).name ?? "—"
}

function inboundSupplierName(
  supplierId: string | null,
  joined: unknown
): string {
  if (!supplierId) return NO_SUPPLIER_LABEL
  return relationName(joined)
}

export const INBOUND_STATUS_LABELS: Record<InvInboundStatus, string> = {
  draft: "แบบร่าง",
  pending: "เปิดรับสแกน",
  approved: "อนุมัติแล้ว",
  cancelled: "ยกเลิก",
}

export async function listInvInboundOrders(options?: {
  status?: InvInboundStatus
}): Promise<InvInboundOrderRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from("inv_inbound_orders")
    .select(
      "id, supplier_id, warehouse_id, status, received_date, notes, created_by, created_at, updated_at, inv_suppliers(name), inv_warehouses(name), inv_inbound_items(count)"
    )
    .order("created_at", { ascending: false })

  if (options?.status) {
    query = query.eq("status", options.status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const itemsRaw = row.inv_inbound_items as unknown
    const countJoined = Array.isArray(itemsRaw)
      ? (itemsRaw[0] as { count?: number } | undefined)?.count
      : (itemsRaw as { count?: number } | null)?.count

    return {
      id: row.id as string,
      supplier_id: row.supplier_id as string | null,
      warehouse_id: row.warehouse_id as string | null,
      status: row.status as InvInboundStatus,
      received_date: row.received_date as string | null,
      notes: row.notes as string | null,
      created_by: row.created_by as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      supplier_name: inboundSupplierName(
        row.supplier_id as string | null,
        row.inv_suppliers
      ),
      warehouse_name: relationName(row.inv_warehouses),
      item_count: Number(countJoined ?? 0),
    }
  })
}

export async function getInvInboundOrder(id: string): Promise<InvInboundOrder | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_inbound_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as InvInboundOrder | null
}

export async function getInvInboundOrderDetail(id: string): Promise<{
  order: InvInboundOrder
  supplier_name: string
  warehouse_name: string
  items: InvInboundItemRow[]
} | null> {
  const supabase = await createClient()
  const { data: order, error: orderError } = await supabase
    .from("inv_inbound_orders")
    .select("*, inv_suppliers(name), inv_warehouses(name)")
    .eq("id", id)
    .maybeSingle()

  if (orderError) throw new Error(orderError.message)
  if (!order) return null

  const { data: items, error: itemsError } = await supabase
    .from("inv_inbound_items")
    .select("*, inv_skus(code, name)")
    .eq("inbound_order_id", id)
    .order("created_at", { ascending: true })

  if (itemsError) throw new Error(itemsError.message)

  const itemRows: InvInboundItemRow[] = (items ?? []).map((row) => {
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

  return {
    order: {
      id: order.id as string,
      supplier_id: order.supplier_id as string | null,
      warehouse_id: order.warehouse_id as string | null,
      status: order.status as InvInboundOrder["status"],
      received_date: order.received_date as string | null,
      notes: order.notes as string | null,
      created_by: order.created_by as string | null,
      created_at: order.created_at as string,
      updated_at: order.updated_at as string,
    },
    supplier_name: inboundSupplierName(
      order.supplier_id as string | null,
      order.inv_suppliers
    ),
    warehouse_name: relationName(order.inv_warehouses),
    items: itemRows,
  }
}

export async function lookupSkuByBarcode(
  barcode: string
): Promise<{ id: string; code: string; name: string; unit_id: string | null } | null> {
  const trimmed = normalizeInventoryBarcode(barcode)
  if (!trimmed) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_skus")
    .select("id, code, name, unit_id")
    .eq("barcode", trimmed)
    .eq("is_active", true)
    .order("code", { ascending: true })
    .limit(2)

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return null
  if (data.length > 1) {
    throw new Error(
      formatInventoryBarcodeConflict(
        trimmed,
        data.map((row) => row.code as string)
      )
    )
  }

  return {
    id: data[0].id as string,
    code: data[0].code as string,
    name: data[0].name as string,
    unit_id: (data[0].unit_id as string | null) ?? null,
  }
}

/** Returns a user-facing error when barcode exists but SKU is inactive */
export async function inactiveSkuBarcodeMessage(
  barcode: string
): Promise<string | null> {
  const trimmed = normalizeInventoryBarcode(barcode)
  if (!trimmed) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_skus")
    .select("code, name")
    .eq("barcode", trimmed)
    .eq("is_active", false)
    .order("code", { ascending: true })
    .limit(1)

  if (error || !data || data.length === 0) return null
  const code = data[0].code as string
  return `พบ SKU ${code} แต่ถูกปิดใช้งาน — เปิด「ใช้งาน」ที่เมนู SKU ก่อนสแกน`
}
