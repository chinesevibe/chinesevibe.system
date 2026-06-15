import type { messagingApi } from "@line/bot-sdk"

import { submitDailyAttendance } from "@/lib/attendance/submit-daily"
import type { ActionContext } from "@/lib/line/handlers/actions"
import {
  notRegisteredFlex,
  pendingApprovalFlex,
} from "@/lib/line/flex/menu-guide"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

export async function submitAttendanceAction(
  ctx: ActionContext
): Promise<messagingApi.Message[]> {
  const locale = ctx.locale ?? DEFAULT_LOCALE

  if (!ctx.lineUserId) {
    return [{ type: "text", text: t("line.error.noUser", locale) }]
  }

  const result = await submitDailyAttendance({ lineUserId: ctx.lineUserId })

  switch (result.status) {
    case "success":
      return [{ type: "text", text: t("line.submit.saved", locale) }]
    case "not_checked_in":
      return [{ type: "text", text: t("line.submit.notCheckedIn", locale) }]
    case "not_checked_out":
      return [{ type: "text", text: t("line.submit.notCheckedOut", locale) }]
    case "already_submitted":
      return [{ type: "text", text: t("line.submit.alreadySaved", locale) }]
    case "pending_approval":
      return [pendingApprovalFlex(locale)]
    case "not_registered":
      return [notRegisteredFlex(locale)]
  }
}
