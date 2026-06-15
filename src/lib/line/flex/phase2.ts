import type { messagingApi } from "@line/bot-sdk"

import {
  announcementGuideFlex,
  complaintGuideFlex,
  documentGuideFlex,
} from "@/lib/line/flex/menu-guide"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

/** @deprecated Use *GuideFlex — kept for existing imports */
export function phase2Flex(title: string): messagingApi.FlexMessage {
  switch (title) {
    case "ขอเอกสาร":
      return documentGuideFlex(undefined, DEFAULT_LOCALE)
    case "ร้องเรียน":
      return complaintGuideFlex(undefined, DEFAULT_LOCALE)
    case "ประกาศ":
      return announcementGuideFlex(DEFAULT_LOCALE)
    default:
      return documentGuideFlex(undefined, DEFAULT_LOCALE)
  }
}
