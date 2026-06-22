import type { messagingApi } from "@line/bot-sdk"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { checkStockGuideFlex } from "@/lib/line/flex/menu-guide"
import { publicBaseUrl } from "@/lib/i18n/liff-url"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import { isStockCommandEnabled, stockCommandDisabledMessage } from "@/lib/line/slash-commands"

export function checkStockAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  if (!isStockCommandEnabled()) {
    return [stockCommandDisabledMessage(locale)]
  }
  const base = publicBaseUrl()
  const stockUrl = base ? `${base}/portal/stock?lang=${locale}` : undefined
  const inboundUrl = base ? `${base}/portal/inbound?lang=${locale}` : undefined
  return [checkStockGuideFlex({ stockUrl, inboundUrl }, locale)]
}
