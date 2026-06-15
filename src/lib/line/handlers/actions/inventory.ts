import type { messagingApi } from "@line/bot-sdk"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { inventoryGuideFlex } from "@/lib/line/flex/menu-guide"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

export function inventoryAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
  const portalUrl = base ? `${base}/portal/inbound?lang=${locale}` : undefined
  return [inventoryGuideFlex(portalUrl, locale)]
}
