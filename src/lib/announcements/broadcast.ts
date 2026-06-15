import type { messagingApi } from "@line/bot-sdk"
import type { SupabaseClient } from "@supabase/supabase-js"

import { announcementImagePublicUrl } from "@/lib/announcements/image"
import { coerceLocale, type AppLocale } from "@/lib/i18n/types"
import { announcementBroadcastFlex } from "@/lib/line/flex/announcement-list"
import { getLineClient } from "@/lib/line/client"

const MULTICAST_LIMIT = 500

export type AnnouncementBroadcastOptions = {
  title: string
  body: string
  targetType: string
  targetValue: string | null
  imagePath?: string | null
}

export type AnnouncementBroadcastResult = {
  recipientCount: number
  imageSentOnLine: boolean
}

function lineErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const body = (error as { body?: string }).body
    if (typeof body === "string" && body.trim()) {
      try {
        const parsed = JSON.parse(body) as { message?: string }
        if (parsed.message) return parsed.message
      } catch {
        return body.slice(0, 200)
      }
    }
  }
  if (error instanceof Error) return error.message
  return "ส่ง LINE ไม่สำเร็จ"
}

async function imageUrlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      cache: "no-store",
    })
    return res.ok || res.status === 206
  } catch {
    return false
  }
}

function buildMessages(
  options: AnnouncementBroadcastOptions,
  includeImage: boolean,
  locale: AppLocale
) {
  const imageUrl = includeImage ? announcementImagePublicUrl(options.imagePath) : null
  const messages: messagingApi.Message[] = []

  messages.push(
    announcementBroadcastFlex({
      title: options.title,
      body: options.body,
      hasImage: Boolean(imageUrl),
      locale,
    })
  )

  if (imageUrl) {
    messages.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    })
  }

  return messages
}

async function multicastChunk(
  line: ReturnType<typeof getLineClient>,
  targets: string[],
  messages: messagingApi.Message[]
) {
  for (let i = 0; i < targets.length; i += MULTICAST_LIMIT) {
    const chunk = targets.slice(i, i + MULTICAST_LIMIT)
    await line.multicast({ to: chunk, messages })
  }
}

export async function broadcastAnnouncement(
  admin: SupabaseClient,
  options: AnnouncementBroadcastOptions
): Promise<AnnouncementBroadcastResult> {
  let query = admin
    .from("hr_employees")
    .select("line_user_id, preferred_locale")
    .eq("status", "active")
    .not("line_user_id", "is", null)

  if (options.targetType === "department" && options.targetValue) {
    query = query.eq("department", options.targetValue)
  }

  const { data: rows, error } = await query
  if (error) throw new Error(error.message)

  const targetsByLocale = new Map<AppLocale, string[]>()
  for (const row of rows ?? []) {
    const lineUserId = row.line_user_id as string | null
    if (!lineUserId) continue
    const locale = coerceLocale(row.preferred_locale)
    targetsByLocale.set(locale, [...(targetsByLocale.get(locale) ?? []), lineUserId])
  }
  const targets = Array.from(targetsByLocale.values()).flat()
  if (targets.length === 0) {
    return { recipientCount: 0, imageSentOnLine: false }
  }

  const line = getLineClient()
  const imageUrl = announcementImagePublicUrl(options.imagePath)
  const canTryImage = imageUrl ? await imageUrlReachable(imageUrl) : false
  const buildLocaleMessages = (locale: AppLocale, includeImage: boolean) =>
    buildMessages(options, includeImage, locale)

  try {
    for (const [locale, localeTargets] of targetsByLocale) {
      await multicastChunk(
        line,
        localeTargets,
        buildLocaleMessages(locale, canTryImage)
      )
    }
    return {
      recipientCount: targets.length,
      imageSentOnLine: canTryImage,
    }
  } catch (firstError) {
    if (!canTryImage) {
      throw new Error(lineErrorMessage(firstError))
    }

    try {
      for (const [locale, localeTargets] of targetsByLocale) {
        await multicastChunk(line, localeTargets, buildLocaleMessages(locale, false))
      }
      return {
        recipientCount: targets.length,
        imageSentOnLine: false,
      }
    } catch (secondError) {
      throw new Error(lineErrorMessage(secondError))
    }
  }
}
