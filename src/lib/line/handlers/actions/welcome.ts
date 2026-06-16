import type { messagingApi } from "@line/bot-sdk"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { buildWelcomeReplyMessages } from "@/lib/line/welcome-messages"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

/** Rich Menu / postback — ส่งข้อความต้อนรับ + รูปคู่มือลงทะเบียน */
export function welcomeAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return buildWelcomeReplyMessages(locale)
}
