export const EMPLOYEE_COMPLIANCE_ATTACHMENT_BUCKET = "hr-compliance-notes"
export const EMPLOYEE_COMPLIANCE_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
export const EMPLOYEE_COMPLIANCE_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export function sanitizeComplianceAttachmentFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "evidence"
}

export function isAllowedComplianceAttachment(file: File): boolean {
  return (
    EMPLOYEE_COMPLIANCE_ATTACHMENT_TYPES.includes(
      file.type as (typeof EMPLOYEE_COMPLIANCE_ATTACHMENT_TYPES)[number]
    ) &&
    file.size > 0 &&
    file.size <= EMPLOYEE_COMPLIANCE_ATTACHMENT_MAX_BYTES
  )
}
