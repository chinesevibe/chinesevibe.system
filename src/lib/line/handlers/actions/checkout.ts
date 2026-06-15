import type { messagingApi } from "@line/bot-sdk"

import { checkoutGuideFlex } from "@/lib/line/flex/menu-guide"
import type { ActionContext } from "@/lib/line/handlers/actions"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

function checkoutGuideWithLocationQuickReply(
  locale = DEFAULT_LOCALE
): messagingApi.Message {
  return {
    ...checkoutGuideFlex(locale),
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "location",
            label: t("line.checkoutGuide.shareLocation", locale),
          },
        },
      ],
    },
  }
}

export function checkoutAction(ctx: ActionContext): messagingApi.Message[] {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  return [checkoutGuideWithLocationQuickReply(locale)]
}

/** Legacy postback — route to location share (geofence enforced on location message). */
export async function checkoutConfirmAction(
  ctx: ActionContext
): Promise<messagingApi.Message[]> {
  return checkoutAction(ctx)
}
