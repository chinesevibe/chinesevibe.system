import type { messagingApi } from "@line/bot-sdk"

import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import { flexMessage, simpleBubble } from "@/lib/line/flex/base"

// Standalone late notice (T09). No caller yet — the T10 morning cron and
// HR alerts reuse this template.
export function lateReminderFlex({
  name,
  lateMinutes,
  dateText,
  locale = DEFAULT_LOCALE,
}: {
  name: string
  lateMinutes: number
  dateText?: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const rows = [
    { label: t("line.common.employee", locale), value: name },
    {
      label: t("line.common.status", locale),
      value: t("line.late.status", locale, { minutes: lateMinutes }),
      valueColor: "#F39C12",
    },
    ...(dateText ? [{ label: t("line.common.date", locale), value: dateText }] : []),
  ]

  return flexMessage(
    t("line.late.alt", locale, { minutes: lateMinutes }),
    simpleBubble({
      title: t("line.late.title", locale),
      accentColor: "#F39C12",
      rows,
    })
  )
}
