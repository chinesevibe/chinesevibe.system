import type { messagingApi } from "@line/bot-sdk"

import { checkinGuideFlex } from "@/lib/line/flex/menu-guide"
import type { ActionContext } from "@/lib/line/handlers/actions"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

const LOCATION_LABEL: Record<AppLocale, string> = {
  th: "📍 แชร์ตำแหน่ง",
  en: "📍 Share location",
  zh: "📍 分享位置",
  my: "📍 တည်နေရာ မျှဝေပါ",
}

// Step 1 of check-in: guide card + quickReply for LINE location pin.
export function checkinInAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [
    {
      ...checkinGuideFlex(locale),
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
