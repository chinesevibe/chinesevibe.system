import type { messagingApi } from "@line/bot-sdk"

import { flexMessage, simpleBubble } from "@/lib/line/flex/base"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

function formatDuration(minutes: number, locale: AppLocale): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0
    ? t("line.duration.hoursMinutes", locale, { h, m })
    : t("line.duration.hours", locale, { h })
}

export function checkoutSummaryFlex({
  name,
  inText,
  outText,
  workMinutes,
  // overtimeMinutes kept for backward-compat but intentionally ignored — OT
  // is surfaced only via the OT-request flow, not the checkout message.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  overtimeMinutes: _overtimeMinutes,
  showWorkDuration = true,
  locale = DEFAULT_LOCALE,
}: {
  name: string
  inText: string
  outText: string
  workMinutes: number
  overtimeMinutes?: number
  showWorkDuration?: boolean
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const rows: { label: string; value: string }[] = [
    { label: t("line.checkin.employee", locale), value: name },
    {
      label: t("line.checkout.checkIn", locale),
      value: t("line.checkin.timeValue", locale, { time: inText }),
    },
    {
      label: t("line.checkout.checkOut", locale),
      value: t("line.checkin.timeValue", locale, { time: outText }),
    },
  ]

  if (showWorkDuration) {
    rows.push({
      label: t("line.checkout.total", locale),
      value: formatDuration(workMinutes, locale),
    })
  }

  return flexMessage(
    t("line.checkout.alt", locale, { time: outText }),
    simpleBubble({
      title: t("line.checkout.title", locale),
      accentColor: "#1E6FD9",
      rows,
      footerNote: t("line.checkout.footer", locale),
    })
  )
}
