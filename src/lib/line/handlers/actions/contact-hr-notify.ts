import type { messagingApi } from "@line/bot-sdk"

import { getAdminClient } from "@/lib/auth/admin-client"
import type { ActionContext } from "@/lib/line/handlers/actions"
import { t } from "@/lib/i18n/translate"
import { notifyHr } from "@/lib/line/notify-hr"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

export async function contactHrNotifyAction(
  ctx: ActionContext
): Promise<messagingApi.Message[]> {
  const locale = ctx.locale ?? DEFAULT_LOCALE
  const lineUserId = ctx.lineUserId
  if (!lineUserId) {
    return [
      {
        type: "text",
        text: t("line.contactHrNotify.noUser", locale),
      },
    ]
  }

  const { data: employee } = await getAdminClient()
    .from("hr_employees")
    .select("name, department, position")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  const name = employee?.name ?? t("line.contactHrNotify.unknownName", locale)
  const department = employee?.department ?? "—"
  const position = employee?.position ?? "—"

  const { pushed } = await notifyHr([
    {
      type: "text",
      text: [
        t("line.contactHrNotify.hrTitle", locale),
        t("line.contactHrNotify.hrName", locale, { name }),
        t("line.contactHrNotify.hrDepartment", locale, { department }),
        t("line.contactHrNotify.hrPosition", locale, { position }),
        `LINE ID: ${lineUserId}`,
        "",
        t("line.contactHrNotify.hrReply", locale),
      ].join("\n"),
    },
  ])

  if (pushed === 0) {
    return [
      {
        type: "text",
        text: t("line.contactHrNotify.noHrGroup", locale),
      },
    ]
  }

  return [
    {
      type: "text",
      text: t("line.contactHrNotify.sent", locale),
    },
  ]
}
