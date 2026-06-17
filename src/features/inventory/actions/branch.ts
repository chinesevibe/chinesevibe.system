"use server"

import { revalidatePath } from "next/cache"

import {
  assertInventoryManage,
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type { InvBranch, InventoryActionState } from "@/features/inventory/types"
import { invBranchSchema } from "@/features/inventory/validators/branch"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/branches"

function formDataToObject(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    address: formData.get("address"),
    hr_branch_id: formData.get("hr_branch_id"),
    is_active: formData.get("is_active") ?? "false",
  }
}

export async function createInvBranch(
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = invBranchSchema.parse(formDataToObject(formData))
    const supabase = await createClient()
    const { error } = await supabase.from("inv_branches").insert(payload)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    revalidatePath("/admin/inventory/warehouses")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function updateInvBranch(
  id: string,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const payload = invBranchSchema.parse(formDataToObject(formData))
    const supabase = await createClient()
    const { error } = await supabase.from("inv_branches").update(payload).eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    revalidatePath("/admin/inventory/warehouses")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function deleteInvBranch(id: string): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const supabase = await createClient()
    const { error } = await supabase.from("inv_branches").delete().eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    revalidatePath("/admin/inventory/warehouses")
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function getInvBranches(search?: string): Promise<InvBranch[]> {
  const supabase = await createClient()
  const trimmedSearch = search?.trim()
  let query = supabase.from("inv_branches").select("*").order("code", { ascending: true })

  if (trimmedSearch) {
    query = query.or(
      `code.ilike.%${trimmedSearch}%,name.ilike.%${trimmedSearch}%,address.ilike.%${trimmedSearch}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as InvBranch[]
}

export async function getInvBranch(id: string): Promise<InvBranch | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_branches")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as InvBranch | null
}

export async function listHrBranchesForMapping(): Promise<
  Array<{ id: string; code: string; name: string }>
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_branches")
    .select("id, code, name")
    .order("code", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Array<{ id: string; code: string; name: string }>
}
