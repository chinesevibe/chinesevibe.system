export const EMPLOYEE_AVATAR_BUCKET = "hr-avatars"
export const EMPLOYEE_AVATAR_MAX_BYTES = 3 * 1024 * 1024
export const EMPLOYEE_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export function sanitizeAvatarFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "avatar"
}

export function employeeAvatarPublicUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  if (!base) return null
  return `${base}/storage/v1/object/public/${EMPLOYEE_AVATAR_BUCKET}/${path}`
}

export function isAllowedEmployeeAvatar(file: File): boolean {
  return (
    EMPLOYEE_AVATAR_TYPES.includes(
      file.type as (typeof EMPLOYEE_AVATAR_TYPES)[number]
    ) &&
    file.size > 0 &&
    file.size <= EMPLOYEE_AVATAR_MAX_BYTES
  )
}
