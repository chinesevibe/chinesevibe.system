import type { messagingApi } from "@line/bot-sdk"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { contactHrGuideFlex } from "@/lib/line/flex/menu-guide"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

export function contactHrAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [contactHrGuideFlex(locale)]
}
