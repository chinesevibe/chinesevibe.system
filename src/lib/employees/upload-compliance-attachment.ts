import {
  EMPLOYEE_COMPLIANCE_ATTACHMENT_BUCKET,
  sanitizeComplianceAttachmentFilename,
} from "@/lib/employees/compliance-attachment"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function uploadComplianceAttachment(
  supabase: SupabaseClient,
  employeeId: string,
  category: string,
  file: File
): Promise<string> {
  const path = `${employeeId}/${category}/${Date.now()}_${sanitizeComplianceAttachmentFilename(file.name)}`
  const { error } = await supabase.storage
    .from(EMPLOYEE_COMPLIANCE_ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}

export async function deleteComplianceAttachment(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<void> {
  if (!path?.trim()) return
  const { error } = await supabase.storage
    .from(EMPLOYEE_COMPLIANCE_ATTACHMENT_BUCKET)
    .remove([path])
  if (error) throw error
}
