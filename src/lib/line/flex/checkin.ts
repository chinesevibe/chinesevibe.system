import type { messagingApi } from "@line/bot-sdk"

import { flexMessage, simpleBubble } from "@/lib/line/flex/base"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

export function checkinConfirmFlex({
  name,
  timeText,
  lateMinutes,
  locale = DEFAULT_LOCALE,
}: {
  name: string
  timeText: string
  lateMinutes: number
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const isLate = lateMinutes > 0

  return flexMessage(
    t("line.checkin.alt", locale, { time: timeText }),
    simpleBubble({
      title: isLate
        ? t("line.checkin.lateTitle", locale)
        : t("line.checkin.title", locale),
      accentColor: isLate ? "#F39C12" : "#06C755",
      rows: [
        { label: t("line.checkin.employee", locale), value: name },
        {
          label: t("line.checkin.time", locale),
          value: t("line.checkin.timeValue", locale, { time: timeText }),
        },
        {
          label: t("line.checkin.status", locale),
          value: isLate
            ? t("line.checkin.late", locale, { minutes: lateMinutes })
            : t("line.checkin.onTime", locale),
          valueColor: isLate ? "#F39C12" : "#06C755",
        },
      ],
    })
  )
}
