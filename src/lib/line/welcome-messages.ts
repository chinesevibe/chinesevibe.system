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

/** Welcome reply when a user adds the OA (follow event). */
export function buildWelcomeReplyMessages(
  locale: AppLocale
): messagingApi.Message[] {
  const base = publicBaseUrl()
  const text: messagingApi.TextMessage = {
    type: "text",
    text: t("line.welcome.greeting", locale, { registerUrl: registerUrl() }),
  }

  const guides = REGISTER_GUIDE_PATHS.map((path) =>
    imageMessage(`${base}${path}`)
  )

  return [text, ...guides]
}

/** Plain text for LINE Official Account Manager → Greeting message (copy/paste). */
export function lineConsoleGreetingText(): string {
  return t("line.welcome.greeting", "th", { registerUrl: registerUrl() })
}
