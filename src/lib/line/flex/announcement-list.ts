import type { messagingApi } from "@line/bot-sdk"

import { TH_TIMEZONE } from "@/lib/datetime/thailand"
import { flexMessage, simpleBubble } from "@/lib/line/flex/base"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

const LINE_BODY_MAX = 1200
const INTL_LOCALES: Record<AppLocale, string> = {
  th: "th-TH",
  en: "en-US",
  zh: "zh-CN",
  my: "my-MM",
}

function announcementBodyLines(body: string): string[] {
  const text =
    body.length > LINE_BODY_MAX ? `${body.slice(0, LINE_BODY_MAX - 1)}…` : body
  const lines = text.split(/\r?\n/)
  return lines.length > 0 ? lines : [text]
}

function formatAnnouncementDate(value: string, locale: AppLocale): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(INTL_LOCALES[locale], {
    timeZone: TH_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function announcementBroadcastFlex(options: {
  title: string
  body: string
  hasImage?: boolean
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  return flexMessage(
    t("line.announcementBroadcast.alt", locale, { title: options.title }),
    simpleBubble({
      title: options.title,
      accentColor: "#00897B",
      lines: announcementBodyLines(options.body),
      footerNote: options.hasImage
        ? t("line.announcementBroadcast.footerWithImage", locale)
        : t("line.announcementBroadcast.footer", locale),
      wide: true,
    })
  )
}

export function announcementListFlex(
  items: { title: string; body: string; sentAt: string }[],
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  if (items.length === 0) {
    return flexMessage(
      t("line.announcementList.altEmpty", locale),
      simpleBubble({
        title: t("line.announcementList.title", locale),
        accentColor: "#00897B",
        rows: [
          {
            label: t("line.announcementList.labelStatus", locale),
            value: t("line.announcementList.statusEmpty", locale),
          },
        ],
        footerNote: t("line.announcementList.footerEmpty", locale),
      })
    )
  }

  const latest = items[0]
  const date = formatAnnouncementDate(latest.sentAt, locale)

  const rows = [
    {
      label: t("line.announcementList.labelLatest", locale),
      value: latest.title,
    },
    { label: t("line.announcementList.labelDate", locale), value: date },
    {
      label: t("line.announcementList.labelDetail", locale),
      value:
        latest.body.length > 120
          ? `${latest.body.slice(0, 117)}...`
          : latest.body,
    },
  ]

  if (items.length > 1) {
    rows.push({
      label: t("line.announcementList.labelMore", locale),
      value: t("line.announcementList.moreCount", locale, {
        count: items.length - 1,
      }),
    })
  }

  return flexMessage(
    t("line.announcementList.altLatest", locale),
    simpleBubble({
      title: t("line.announcementList.title", locale),
      accentColor: "#00897B",
      rows,
      footerNote: t("line.announcementList.footerMore", locale),
    })
  )
}
