import type { messagingApi } from "@line/bot-sdk"

import { publicBaseUrl } from "@/lib/i18n/liff-url"
import { t } from "@/lib/i18n/translate"
import type { AppLocale } from "@/lib/i18n/types"

const DEFAULT_KEYWORDS = [
  "สวัสดี",
  "ดีครับ",
  "ดีค่ะ",
  "hello",
  "hi",
  "hey",
  "help",
  "เมนู",
  "menu",
  "ช่วยเหลือ",
  "ช่วยด้วย",
  "ติดต่อ",
] as const

function configuredKeywords(): string[] {
  const raw = process.env.LINE_AUTO_REPLY_KEYWORDS
  if (raw === "") return []
  if (raw?.trim()) {
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
  }
  return [...DEFAULT_KEYWORDS]
}

/** Match LINE OA auto-response keywords (Webhook cannot use Console rules). */
export function shouldSendLineAutoReply(text: string): boolean {
  if (process.env.LINE_AUTO_REPLY_ALL === "true") return true

  const normalized = text.trim().toLowerCase()
  if (!normalized) return false

  const keywords = configuredKeywords()
  if (keywords.length === 0) return false

  return keywords.some((keyword) => {
    const k = keyword.toLowerCase()
    return normalized === k || normalized.includes(k)
  })
}

/**
 * Text-only auto-reply (no Flex card) when Webhook mode is on.
 */
export async function buildLineAutoReplyMessages(
  locale: AppLocale
): Promise<messagingApi.Message[]> {
  const base = publicBaseUrl()
  const text = t("line.welcome.greeting", locale, {
    registerUrl: base ? `${base}/register` : "/register",
  })

  return [{ type: "text", text }]
}
