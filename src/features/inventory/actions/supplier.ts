"use server"

import { revalidatePath } from "next/cache"

import {
  assertInventoryManage,
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type { InventoryActionState, InvSupplier } from "@/features/inventory/types"
import { invSupplierSchema } from "@/features/inventory/validators/supplier"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/suppliers"

function formDataToObject(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    address: formData.get("address"),
    contact: formData.get("contact"),
    is_active: formData.get("is_active") ?? "false",
  }
}

export async function createInvSupplier(
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = invSupplierSchema.parse(formDataToObject(formData))
    const supabase = await createClient()
    const { error } = await supabase.from("inv_suppliers").insert(payload)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function updateInvSupplier(
  id: string,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = invSupplierSchema.parse(formDataToObject(formData))
    const supabase = await createClient()
    const { error } = await supabase.from("inv_suppliers").update(payload).eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function deleteInvSupplier(id: string): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const supabase = await createClient()
    const { error } = await supabase.from("inv_suppliers").delete().eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function getInvSuppliers(search?: string): Promise<InvSupplier[]> {
  const supabase = await createClient()
  const trimmedSearch = search?.trim()
  let query = supabase.from("inv_suppliers").select("*").order("code", { ascending: true })

  if (trimmedSearch) {
    query = query.or(
      `code.ilike.%${trimmedSearch}%,name.ilike.%${trimmedSearch}%,address.ilike.%${trimmedSearch}%,contact.ilike.%${trimmedSearch}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as InvSupplier[]
}

export async function getInvSupplier(id: string): Promise<InvSupplier | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_suppliers")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as InvSupplier | null
}
