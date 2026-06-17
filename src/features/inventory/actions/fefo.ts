"use server"

import { assertInventoryOperate, formatInventoryError } from "@/features/inventory/actions/auth"
import type { InvFefoAllocation } from "@/features/inventory/types"
import { createClient } from "@/lib/supabase/server"

export type InvStockLotOption = {
  id: string
  lot_number: string
  expiry_date: string | null
  remaining_qty: number
  status: string
}

export async function listAvailableLots(
  skuId: string,
  warehouseId: string
): Promise<
  { success: true; lots: InvStockLotOption[] } | { success: false; error: string }
> {
  try {
    await assertInventoryOperate()
    if (!skuId || !warehouseId) {
      return { success: true, lots: [] }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("inv_stock_lots")
      .select("id, lot_number, expiry_date, remaining_qty, status")
      .eq("sku_id", skuId)
      .eq("warehouse_id", warehouseId)
      .gt("remaining_qty", 0)
      .in("status", ["available"])
      .order("expiry_date", { ascending: true, nullsFirst: false })
      .order("received_date", { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      lots: (data ?? []).map((row) => ({
        id: row.id as string,
        lot_number: row.lot_number as string,
        expiry_date: (row.expiry_date as string | null) ?? null,
        remaining_qty: Number(row.remaining_qty),
        status: row.status as string,
      })),
    }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function getFefoAllocations(
  skuId: string,
  warehouseId: string,
  qty: number,
  issueMethod?: string
): Promise<{ success: true; allocations: InvFefoAllocation[] } | { success: false; error: string }> {
  try {
    await assertInventoryOperate()
    if (qty <= 0) {
      return { success: false, error: "จำนวนต้องมากกว่า 0" }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("inv_allocate_fefo", {
      p_sku_id: skuId,
      p_warehouse_id: warehouseId,
      p_qty: qty,
      p_issue_method: issueMethod ?? null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    const allocations = (data ?? []) as InvFefoAllocation[]
    return { success: true, allocations }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function listFefoOverrideAudit(limit = 50) {
  await assertInventoryOperate()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_requisition_issue_lines")
    .select(
      "id, qty_issued, override_reason, created_at, inv_requisition_items(requisition_id, sku_id, inv_skus(code, name)), inv_stock_lots(lot_number, expiry_date), overridden_by"
    )
    .not("override_reason", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}
