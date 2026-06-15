import type { messagingApi } from "@line/bot-sdk"

import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import {
  notRegisteredFlex,
  pendingApprovalFlex,
} from "@/lib/line/flex/menu-guide"
import { resolveLineEmployee } from "@/lib/line/resolve-line-employee"
import type { RichMenuPostbackAction } from "@/lib/line/types"

const OPEN_ACTIONS = new Set<RichMenuPostbackAction>([
  "contact_hr",
  "contact_hr_notify",
])

export async function lineAccessGateMessages(
  lineUserId: string | undefined,
  action: RichMenuPostbackAction
): Promise<messagingApi.Message[] | null> {
  if (OPEN_ACTIONS.has(action)) {
    return null
  }

  const locale = lineUserId
    ? await resolveLocaleForLineUser(lineUserId)
    : DEFAULT_LOCALE

  if (!lineUserId) {
    return [{ type: "text", text: t("line.error.gate", locale) }]
  }

  const lookup = await resolveLineEmployee(lineUserId)
  if (lookup.state === "none") return [notRegisteredFlex(locale)]
  if (lookup.state === "pending") return [pendingApprovalFlex(locale)]
  return null
}
