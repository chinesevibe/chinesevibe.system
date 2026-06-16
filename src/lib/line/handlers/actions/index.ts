import type { messagingApi } from "@line/bot-sdk"

import type { RichMenuPostbackAction } from "@/lib/line/types"
import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import { announcementAction } from "@/lib/line/handlers/actions/announcement"
import { checkStockAction } from "@/lib/line/handlers/actions/check-stock"
import { checkinAction } from "@/lib/line/handlers/actions/checkin"
import { checkinInAction } from "@/lib/line/handlers/actions/checkin-in"
import {
  checkoutAction,
  checkoutConfirmAction,
} from "@/lib/line/handlers/actions/checkout"
import { complaintAction } from "@/lib/line/handlers/actions/complaint"
import { documentAction } from "@/lib/line/handlers/actions/document"
import { contactHrAction } from "@/lib/line/handlers/actions/contact-hr"
import { contactHrNotifyAction } from "@/lib/line/handlers/actions/contact-hr-notify"
import { welcomeAction } from "@/lib/line/handlers/actions/welcome"
import { inventoryAction } from "@/lib/line/handlers/actions/inventory"
import { leaveAction } from "@/lib/line/handlers/actions/leave"
import { overtimeAction } from "@/lib/line/handlers/actions/overtime"
import { submitAttendanceAction } from "@/lib/line/handlers/actions/submit-attendance"

export type ActionContext = {
  lineUserId?: string
  locale?: AppLocale
}

const ACTION_HANDLERS: Record<
  RichMenuPostbackAction,
  (ctx: ActionContext) => messagingApi.Message[] | Promise<messagingApi.Message[]>
> = {
  checkin: checkinAction,
  checkin_in: checkinInAction,
  checkout: checkoutAction,
  checkout_confirm: checkoutConfirmAction,
  submit_attendance: submitAttendanceAction,
  leave: leaveAction,
  overtime: overtimeAction,
  document: documentAction,
  complaint: complaintAction,
  inventory: inventoryAction,
  check_stock: checkStockAction,
  announcement: announcementAction,
  contact_hr: contactHrAction,
  contact_hr_notify: contactHrNotifyAction,
  welcome: welcomeAction,
}

export async function buildActionMessages(
  action: RichMenuPostbackAction,
  ctx: ActionContext
): Promise<messagingApi.Message[]> {
  const locale =
    ctx.locale ??
    (ctx.lineUserId
      ? await resolveLocaleForLineUser(ctx.lineUserId)
      : DEFAULT_LOCALE)

  return ACTION_HANDLERS[action]({ ...ctx, locale })
}
