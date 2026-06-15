"use server"

import { revalidatePath } from "next/cache"

import {
  assertInventoryManage,
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type {
  InvWarehouse,
  InvWarehouseWithBranch,
  InventoryActionState,
} from "@/features/inventory/types"
import { invWarehouseSchema } from "@/features/inventory/validators/warehouse"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/warehouses"

function formDataToObject(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    branch_id: formData.get("branch_id"),
    type: formData.get("type"),
    is_active: formData.get("is_active") ?? "false",
  }
}

export async function createInvWarehouse(
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = invWarehouseSchema.parse(formDataToObject(formData))
    const supabase = await createClient()
    const { error } = await supabase.from("inv_warehouses").insert(payload)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function updateInvWarehouse(
  id: string,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = invWarehouseSchema.parse(formDataToObject(formData))
    const supabase = await createClient()
    const { error } = await supabase.from("inv_warehouses").update(payload).eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function deleteInvWarehouse(id: string): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const supabase = await createClient()
    const { error } = await supabase.from("inv_warehouses").delete().eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function getInvWarehousesWithBranch(
  search?: string
): Promise<InvWarehouseWithBranch[]> {
  const supabase = await createClient()
  const trimmedSearch = search?.trim()
  let query = supabase
    .from("inv_warehouses")
    .select("*, inv_branches(name)")
    .order("code", { ascending: true })

  if (trimmedSearch) {
    query = query.or(
      `code.ilike.%${trimmedSearch}%,name.ilike.%${trimmedSearch}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as InvWarehouseWithBranch[]
}

export async function getInvWarehouse(id: string): Promise<InvWarehouse | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_warehouses")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as InvWarehouse | null
}
