import type { messagingApi } from "@line/bot-sdk"

import { checkoutGuideFlex } from "@/lib/line/flex/menu-guide"
import type { ActionContext } from "@/lib/line/handlers/actions"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

export function checkoutAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [checkoutGuideFlex(locale)]
}

/** Legacy postback — route to LIFF GPS clock. */
export async function checkoutConfirmAction(
  ctx: ActionContext
): Promise<messagingApi.Message[]> {
  return checkoutAction(ctx)
}
