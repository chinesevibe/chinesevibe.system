import {
  ANNOUNCEMENT_IMAGE_BUCKET,
  sanitizeAnnouncementFilename,
} from "@/lib/announcements/image"
import type { SupabaseClient } from "@supabase/supabase-js"

export async function uploadAnnouncementImage(
  supabase: SupabaseClient,
  announcementId: string,
  file: File
): Promise<string> {
  const path = `${announcementId}/${Date.now()}_${sanitizeAnnouncementFilename(file.name)}`
  const { error } = await supabase.storage
    .from(ANNOUNCEMENT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return path
}
