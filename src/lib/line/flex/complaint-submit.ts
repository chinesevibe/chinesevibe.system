import type { messagingApi } from "@line/bot-sdk"

import type { ComplaintThreadEntry } from "@/features/complaints/thread"
import { trimThreadForLine } from "@/features/complaints/thread"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import { BRAND_RED } from "@/lib/line/brand"
import { flexMessage, simpleBubble } from "@/lib/line/flex/base"

function formatThreadLine(entry: ComplaintThreadEntry, locale: AppLocale): string {
  const label =
    entry.role === "employee"
      ? entry.authorName ?? t("line.complaintReply.fromEmployee", locale)
      : entry.authorName ?? t("line.complaintReply.fromHr", locale)
  return `[${label}] ${entry.message}`
}

export function complaintSubmitConfirmFlex(options: {
  ticketCode: string
  isAnonymous: boolean
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  return flexMessage(
    t("line.complaintSubmit.alt", locale),
    simpleBubble({
      title: t("line.complaintSubmit.title", locale),
      accentColor: "#F57C00",
      rows: [
        { label: t("line.common.ticket", locale), value: options.ticketCode },
        {
          label: t("line.common.mode", locale),
          value: options.isAnonymous
            ? t("line.status.anonymous", locale)
            : t("line.status.identified", locale),
        },
        {
          label: t("line.common.status", locale),
          value: t("line.status.open", locale),
          valueColor: "#F59E0B",
        },
      ],
      footerNote: t("line.complaintSubmit.footer", locale),
    })
  )
}

export function complaintSubmitHrNotifyFlex(options: {
  ticketCode: string
  subject: string
  isAnonymous: boolean
  employeeName?: string
  adminUrl?: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const adminUrl =
    options.adminUrl ?? (baseUrl ? `${baseUrl}/admin/complaints` : undefined)

  return flexMessage(
    t("line.complaintHr.alt", locale, { ticketCode: options.ticketCode }),
    simpleBubble({
      title: t("line.complaintHr.title", locale),
      accentColor: BRAND_RED,
      rows: [
        { label: t("line.common.ticket", locale), value: options.ticketCode },
        { label: t("line.common.subject", locale), value: options.subject },
        {
          label: t("line.common.reporter", locale),
          value: options.isAnonymous
            ? t("line.status.anonymous", locale)
            : (options.employeeName ?? "—"),
        },
      ],
      button: adminUrl
        ? { label: t("line.complaintHr.button", locale), uri: adminUrl }
        : undefined,
    })
  )
}

export function complaintReplyFlex(options: {
  ticketCode: string
  subject: string
  message: string
  closed: boolean
  thread: ComplaintThreadEntry[]
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const trimmed = trimThreadForLine(options.thread)
  const threadLines = trimmed.map((entry) => formatThreadLine(entry, locale))

  return flexMessage(
    t("line.complaintReply.alt", locale, { ticketCode: options.ticketCode }),
    simpleBubble({
      title: t("line.complaintReply.title", locale),
      accentColor: "#F57C00",
      rows: [
        { label: t("line.common.ticket", locale), value: options.ticketCode },
        { label: t("line.common.subject", locale), value: options.subject },
        {
          label: t("line.complaintReply.latest", locale),
          value: options.message,
        },
        {
          label: t("line.common.status", locale),
          value: options.closed
            ? t("line.status.closed", locale)
            : t("line.status.replied", locale),
        },
      ],
      lines: [
        t("line.complaintReply.threadTitle", locale),
        ...threadLines,
      ],
      footerNote: options.closed
        ? t("line.complaintReply.defaultCloseMessage", locale)
        : undefined,
    })
  )
}
