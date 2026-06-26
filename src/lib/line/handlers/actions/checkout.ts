import type { messagingApi } from "@line/bot-sdk"

import { checkoutGuideFlex } from "@/lib/line/flex/menu-guide"
import type { ActionContext } from "@/lib/line/handlers/actions"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

const LOCATION_LABEL: Record<AppLocale, string> = {
  th: "📍 แชร์ตำแหน่ง",
  en: "📍 Share location",
  zh: "📍 分享位置",
  my: "📍 တည်နေရာ မျှဝေပါ",
}

export function checkoutAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [
    {
      ...checkoutGuideFlex(locale),
      quickReply: {
        items: [
          {
            type: "action",
            action: { type: "location", label: LOCATION_LABEL[locale] },
          },
        ],
      },
    },
  ]
}

/** Legacy postback — route to guide with quickReply. */
export async function checkoutConfirmAction(
  ctx: ActionContext
): Promise<messagingApi.Message[]> {
  return checkoutAction(ctx)
}
