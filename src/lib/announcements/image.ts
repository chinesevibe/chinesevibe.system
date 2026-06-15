export const ANNOUNCEMENT_IMAGE_BUCKET = "hr-announcements"
export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const ANNOUNCEMENT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

export function sanitizeAnnouncementFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "image"
}

export function announcementImagePublicUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  if (!base) return null
  return `${base}/storage/v1/object/public/${ANNOUNCEMENT_IMAGE_BUCKET}/${path}`
}

export function isAllowedAnnouncementImage(file: File): boolean {
  return (
    ANNOUNCEMENT_IMAGE_TYPES.includes(
      file.type as (typeof ANNOUNCEMENT_IMAGE_TYPES)[number]
    ) && file.size > 0 &&
    file.size <= ANNOUNCEMENT_IMAGE_MAX_BYTES
  )
}
