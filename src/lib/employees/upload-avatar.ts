import {
  EMPLOYEE_AVATAR_BUCKET,
  sanitizeAvatarFilename,
} from "@/lib/employees/avatar"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function uploadEmployeeAvatar(
  supabase: SupabaseClient,
  employeeId: string,
  file: File
): Promise<string> {
  const path = `${employeeId}/${Date.now()}_${sanitizeAvatarFilename(file.name)}`
  const { error } = await supabase.storage
    .from(EMPLOYEE_AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}

export async function deleteEmployeeAvatarFile(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<void> {
  if (!path?.trim()) return
  const { error } = await supabase.storage
    .from(EMPLOYEE_AVATAR_BUCKET)
    .remove([path])
  if (error) throw error
}
