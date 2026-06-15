import type { messagingApi } from "@line/bot-sdk"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { leaveGuideFlex } from "@/lib/line/flex/menu-guide"
import { liffUrl } from "@/lib/i18n/liff-url"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

export function leaveAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  const formUrl = liffUrl("/liff/leave", locale)
  return [leaveGuideFlex(formUrl, locale)]
}
