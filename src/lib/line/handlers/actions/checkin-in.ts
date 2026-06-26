import type { messagingApi } from "@line/bot-sdk"

import { checkinGuideFlex } from "@/lib/line/flex/menu-guide"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

// Step 1 of check-in: guide card with LIFF GPS button.
export function checkinInAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [checkinGuideFlex(locale)]
}
