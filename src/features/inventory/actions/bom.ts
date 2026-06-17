"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  assertInventoryManage,
  assertInventoryOperate,
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type { InventoryActionState, InventoryMultiActionState } from "@/features/inventory/types"
import { recordConsumption } from "@/features/inventory/actions/consumption"
import { createClient } from "@/lib/supabase/server"

const bomLineSchema = z.object({
  sku_id: z.string().uuid(),
  ingredient_sku_id: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unit_id: z.string().uuid().optional().nullable(),
})

const consumeRecipeSchema = z.object({
  branch_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  sku_id: z.string().uuid(),
  qty: z.coerce.number().positive(),
  notes: z.string().trim().max(2000).optional(),
})

export type InvBomRow = {
  id: string
  sku_id: string
  ingredient_sku_id: string
  quantity: number
  is_active: boolean
  finished_code: string
  finished_name: string
  ingredient_code: string
  ingredient_name: string
}

export async function listBomRows(finishedSkuId?: string): Promise<InvBomRow[]> {
  await assertInventoryOperate()
  const supabase = await createClient()
  let query = supabase
    .from("inv_boms")
    .select("id, sku_id, ingredient_sku_id, quantity, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (finishedSkuId) {
    query = query.eq("sku_id", finishedSkuId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const skuIds = Array.from(
    new Set((data ?? []).flatMap((row) => [row.sku_id as string, row.ingredient_sku_id as string]))
  )
  const skuMap = new Map<string, { code: string; name: string }>()
  if (skuIds.length > 0) {
    const { data: skus } = await supabase.from("inv_skus").select("id, code, name").in("id", skuIds)
    for (const sku of skus ?? []) {
      skuMap.set(sku.id as string, { code: sku.code as string, name: sku.name as string })
    }
  }

  return (data ?? []).map((row) => {
    const finished = skuMap.get(row.sku_id as string)
    const ingredient = skuMap.get(row.ingredient_sku_id as string)
    return {
      id: row.id as string,
      sku_id: row.sku_id as string,
      ingredient_sku_id: row.ingredient_sku_id as string,
      quantity: Number(row.quantity),
      is_active: row.is_active as boolean,
      finished_code: finished?.code ?? "—",
      finished_name: finished?.name ?? "—",
      ingredient_code: ingredient?.code ?? "—",
      ingredient_name: ingredient?.name ?? "—",
    }
  })
}

export async function createBomLine(
  input: z.infer<typeof bomLineSchema>
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = bomLineSchema.parse(input)
    const supabase = await createClient()
    const { error } = await supabase.from("inv_boms").insert({
      sku_id: payload.sku_id,
      ingredient_sku_id: payload.ingredient_sku_id,
      quantity: payload.quantity,
      unit_id: payload.unit_id ?? null,
      is_active: true,
    })
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath("/admin/inventory/bom")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function deleteBomLine(id: string): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const supabase = await createClient()
    const { error } = await supabase.from("inv_boms").delete().eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath("/admin/inventory/bom")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function consumeByRecipe(
  input: z.infer<typeof consumeRecipeSchema>
): Promise<InventoryMultiActionState> {
  try {
    await assertInventoryOperate()
    const payload = consumeRecipeSchema.parse(input)
    const lines = await listBomRows(payload.sku_id)
    if (lines.length === 0) {
      return { success: false, error: "ไม่พบสูตร BOM สำหรับ SKU นี้" }
    }

    return recordConsumption({
      branch_id: payload.branch_id,
      warehouse_id: payload.warehouse_id,
      notes: payload.notes ?? `ตัดตามสูตร × ${payload.qty}`,
      items: lines.map((line) => ({
        sku_id: line.ingredient_sku_id,
        qty: line.quantity * payload.qty,
        consumption_type: "production" as const,
        notes: `จากสูตร ${line.finished_code}`,
      })),
    })
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}
