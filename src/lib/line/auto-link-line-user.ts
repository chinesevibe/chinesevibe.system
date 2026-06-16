import type { messagingApi } from "@line/bot-sdk"

import {
  linkLineEmployeeByCode,
  looksLikeEmployeeCode,
} from "@/lib/auth/link-line-employee"
import { isRealLineId } from "@/lib/auth/line-user-id"
import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import { resolveLineEmployee } from "@/lib/line/resolve-line-employee"

/** Try linking portal-only employees when user sends their employee code in chat. */
export async function tryAutoLinkFromEmployeeCode(
  lineUserId: string | undefined,
  text: string
): Promise<messagingApi.Message[] | null> {
  if (!lineUserId || !isRealLineId(lineUserId)) return null
  if (!looksLikeEmployeeCode(text)) return null

  const lookup = await resolveLineEmployee(lineUserId)
  if (lookup.state !== "none") return null

  const result = await linkLineEmployeeByCode(lineUserId, text.trim())
  const locale = await resolveLocaleForLineUser(lineUserId).catch(
    () => DEFAULT_LOCALE
  )

  if (!result.ok) {
    if (result.status === 404) return null
    return [{ type: "text", text: t("line.link.failed", locale) }]
  }

  if (result.alreadyLinked) {
    return [{ type: "text", text: t("line.link.already", locale) }]
  }

  return [
    {
      type: "text",
      text: t("line.link.success", locale, { name: result.employeeName }),
    },
  ]
}
