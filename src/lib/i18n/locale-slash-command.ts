import type { messagingApi } from "@line/bot-sdk"

import { getAdminClient } from "@/lib/auth/admin-client"
import { setManualLocale } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

const LOCALE_SLASH: Record<string, AppLocale> = {
  "/th": "th",
  "/thai": "th",
  "/ไทย": "th",
  "/en": "en",
  "/english": "en",
  "/zh": "zh",
  "/ch": "zh",
  "/chinese": "zh",
  "/中文": "zh",
  "/my": "my",
  "/mm": "my",
  "/burmese": "my",
}

export function parseLocaleSlashCommand(
  text: string
): AppLocale | "menu" | null {
  const key = text.trim().toLowerCase()
  if (key === "/lang" || key === "/language" || key === "/ภาษา") {
    return "menu"
  }
  return LOCALE_SLASH[key] ?? null
}

export async function handleLocaleSlashCommand(
  lineUserId: string | undefined,
  command: AppLocale | "menu"
): Promise<messagingApi.Message[]> {
  if (command === "menu") {
    return [{ type: "text", text: t("line.lang.menu", DEFAULT_LOCALE) }]
  }

  if (!lineUserId) {
    return [{ type: "text", text: t("line.error.noUser", command) }]
  }

  const admin = getAdminClient()
  const { data: employee } = await admin
    .from("hr_employees")
    .select("id")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (!employee) {
    return [{ type: "text", text: t("line.lang.notRegistered", command) }]
  }

  await setManualLocale({ employeeId: employee.id as string, locale: command })

  const langLabel = t(`lang.${command}`, command)
  return [
    {
      type: "text",
      text: t("line.lang.changed", command, { lang: langLabel }),
    },
  ]
}
