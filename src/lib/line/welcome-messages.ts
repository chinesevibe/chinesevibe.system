import type { messagingApi } from "@line/bot-sdk"

import { t } from "@/lib/i18n/translate"
import type { AppLocale } from "@/lib/i18n/types"

const REGISTER_GUIDE_PATHS = [
  "/line/register-guides/guide-th.jpg",
  "/line/register-guides/guide-zh.jpg",
  "/line/register-guides/guide-my.jpg",
] as const

function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ??
    "https://hr-app-two-iota.vercel.app"
  )
}

function registerUrl(): string {
  return `${publicBaseUrl()}/register`
}

function imageMessage(url: string): messagingApi.ImageMessage {
  return {
    type: "image",
    originalContentUrl: url,
    previewImageUrl: url,
  }
}

function buildGuideImageMessages(): messagingApi.ImageMessage[] {
  const base = publicBaseUrl()
  return REGISTER_GUIDE_PATHS.map((path) =>
    imageMessage(`${base}${path}`)
  )
}

/** Follow / unblock — ข้อความต้อนรับ (+ รูป ถ้าไม่ใช้ Console greeting) */
export function buildWelcomeFollowMessages(
  locale: AppLocale
): messagingApi.Message[] {
  const imagesOnly = process.env.LINE_OA_GREETING_IMAGES_ONLY === "true"
  if (imagesOnly) {
    return buildGuideImageMessages()
  }
  return buildWelcomeReplyMessages(locale)
}

/** Reply ทั้งข้อความ + รูปคู่มือ (postback welcome, หรือ add friend) */
export function buildWelcomeReplyMessages(
  locale: AppLocale
): messagingApi.Message[] {
  const text: messagingApi.TextMessage = {
    type: "text",
    text: t("line.welcome.greeting", locale, { registerUrl: registerUrl() }),
  }

  return [text, ...buildGuideImageMessages()]
}

/** Plain text for LINE Official Account Manager → Greeting message (copy/paste). */
export function lineConsoleGreetingText(): string {
  return t("line.welcome.greeting", "th", { registerUrl: registerUrl() })
}
