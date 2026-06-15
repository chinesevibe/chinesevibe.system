import type {
  AnnouncementStatus,
  AnnouncementTargetType,
} from "@/features/announcements/types"
import { announcementImagePublicUrl } from "@/lib/announcements/image"
import { createClient } from "@/lib/supabase/server"

export type AnnouncementRow = {
  id: string
  title: string
  body: string
  imagePath: string | null
  imageUrl: string | null
  targetType: AnnouncementTargetType
  targetValue: string | null
  status: AnnouncementStatus
  sentAt: string | null
  createdAt: string
}

export async function getAnnouncements() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_announcements")
    .select(
      "id, title, body, image_path, target_type, target_value, status, sent_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error

  type RawRow = {
    id: string
    title: string
    body: string
    image_path: string | null
    target_type: string
    target_value: string | null
    status: string
    sent_at: string | null
    created_at: string
  }

  const rows: AnnouncementRow[] = ((data ?? []) as RawRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    imagePath: row.image_path,
    imageUrl: announcementImagePublicUrl(row.image_path),
    targetType: row.target_type as AnnouncementTargetType,
    targetValue: row.target_value,
    status: row.status as AnnouncementStatus,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  }))

  return rows
}
