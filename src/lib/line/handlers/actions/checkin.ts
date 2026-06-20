import type { messagingApi } from "@line/bot-sdk"

import { attendancePickerFlex } from "@/lib/line/flex/menu-guide"
import { liffUrl } from "@/lib/i18n/liff-url"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

// Rich menu "เช็คอิน" → เข้างาน / เลิกงาน — opens LIFF clock page for GPS-based check-in.
export function checkinAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  const clockUrl = liffUrl("/liff/clock", locale)
  return [attendancePickerFlex(clockUrl, locale)]
}
