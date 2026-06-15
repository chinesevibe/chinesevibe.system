"use server"

import { revalidatePath } from "next/cache"

import {
  assertInventoryManage,
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type { InventoryActionState, InvSku, InvUnit } from "@/features/inventory/types"
import { invSkuSchema } from "@/features/inventory/validators/sku"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/sku"

function formDataToObject(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    category: formData.get("category"),
    unit_id: formData.get("unit_id"),
    barcode: formData.get("barcode"),
    min_stock: formData.get("min_stock") ?? 0,
    max_stock: formData.get("max_stock") ?? 0,
    image_url: formData.get("image_url"),
    is_active: formData.get("is_active") ?? "false",
  }
}

export async function createInvSku(formData: FormData): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = invSkuSchema.parse(formDataToObject(formData))
    const supabase = await createClient()
    const { error } = await supabase.from("inv_skus").insert(payload)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function updateInvSku(
  id: string,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = invSkuSchema.parse(formDataToObject(formData))
    const supabase = await createClient()
    const { error } = await supabase.from("inv_skus").update(payload).eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function deleteInvSku(id: string): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const supabase = await createClient()
    const { error } = await supabase.from("inv_skus").delete().eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function getInvSkus(search?: string): Promise<InvSku[]> {
  const supabase = await createClient()
  const trimmedSearch = search?.trim()
  let query = supabase.from("inv_skus").select("*").order("code", { ascending: true })

  if (trimmedSearch) {
    query = query.or(
      `code.ilike.%${trimmedSearch}%,name.ilike.%${trimmedSearch}%,category.ilike.%${trimmedSearch}%,barcode.ilike.%${trimmedSearch}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as InvSku[]
}

export async function getInvSku(id: string): Promise<InvSku | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_skus")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as InvSku | null
}

export async function getInvUnits(): Promise<InvUnit[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_units")
    .select("id,name,abbreviation")
    .order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as InvUnit[]
}
