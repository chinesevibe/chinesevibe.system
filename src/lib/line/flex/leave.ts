import type { messagingApi } from "@line/bot-sdk"

import { leaveGuideFlex } from "@/lib/line/flex/menu-guide"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

/** @deprecated Use leaveGuideFlex — kept for existing imports */
export function leaveFlex(liffId?: string): messagingApi.FlexMessage {
  return leaveGuideFlex(liffId, DEFAULT_LOCALE)
}
