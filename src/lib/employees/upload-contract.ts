import {
  EMPLOYEE_CONTRACT_BUCKET,
  sanitizeContractFilename,
} from "@/lib/employees/contract"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function uploadEmployeeContract(
  supabase: SupabaseClient,
  employeeId: string,
  file: File
): Promise<string> {
  const path = `${employeeId}/${Date.now()}_${sanitizeContractFilename(file.name)}`
  const { error } = await supabase.storage
    .from(EMPLOYEE_CONTRACT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}

export async function deleteEmployeeContractFile(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<void> {
  if (!path?.trim()) return
  const { error } = await supabase.storage
    .from(EMPLOYEE_CONTRACT_BUCKET)
    .remove([path])
  if (error) throw error
}
