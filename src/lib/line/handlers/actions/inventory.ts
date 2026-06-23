import type { messagingApi } from "@line/bot-sdk"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { inventoryGuideFlex } from "@/lib/line/flex/menu-guide"
import { publicBaseUrl } from "@/lib/i18n/liff-url"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

export function inventoryAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  const base = publicBaseUrl()
  const portalUrl = base ? `${base}/line/inbound?lang=${locale}` : undefined
  return [inventoryGuideFlex(portalUrl, locale)]
}
