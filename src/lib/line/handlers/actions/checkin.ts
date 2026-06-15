import type { messagingApi } from "@line/bot-sdk"

import { attendancePickerFlex } from "@/lib/line/flex/menu-guide"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

// Rich menu "เช็คอิน" → เข้างาน / เลิกงาน (สต็อก: พิมพ์ /stock เมื่อ HR เปิด LINE_STOCK_COMMAND_ENABLED).
export function checkinAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [attendancePickerFlex(locale)]
}
