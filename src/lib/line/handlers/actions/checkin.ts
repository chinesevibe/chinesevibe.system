import type { messagingApi } from "@line/bot-sdk"

import { attendancePickerFlex } from "@/lib/line/flex/menu-guide"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

// ponytail: keep attendance in chat so replyToken can send the result without LIFF.
export function checkinAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [attendancePickerFlex(undefined, locale)]
}
