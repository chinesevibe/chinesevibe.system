import type { messagingApi } from "@line/bot-sdk"

import { checkinGuideFlex } from "@/lib/line/flex/menu-guide"
import { t } from "@/lib/i18n/translate"

import type { ActionContext } from "@/lib/line/handlers/actions"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

// Step 1 of check-in: guide card + location quick reply.
export function checkinInAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [
    {
      ...checkinGuideFlex(locale),
      quickReply: {
        items: [
          {
            type: "action",
            action: {
              type: "location",
              label: t("line.checkinGuide.shareLocation", locale),
            },
          },
        ],
      },
    },
  ]
}
