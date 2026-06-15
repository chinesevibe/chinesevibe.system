import type { messagingApi } from "@line/bot-sdk"

import { BRAND_RED } from "@/lib/line/brand"
import { flexMessage, simpleBubble } from "@/lib/line/flex/base"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

export function overtimeSubmitConfirmFlex(options: {
  employeeName: string
  workDate: string
  startTime: string
  endTime: string
  stage?: "hr"
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  return flexMessage(
    t("line.otSubmit.alt", locale),
    simpleBubble({
      title: t("line.otSubmit.title", locale),
      accentColor: "#E65100",
      rows: [
        { label: t("line.common.employee", locale), value: options.employeeName },
        { label: t("line.common.date", locale), value: options.workDate },
        {
          label: t("line.common.time", locale),
          value: `${options.startTime} – ${options.endTime}`,
        },
        {
          label: t("line.common.status", locale),
          value: t("line.status.pendingHr", locale),
          valueColor: "#F59E0B",
        },
      ],
      footerNote: t("line.otSubmit.footer", locale),
    })
  )
}

export function overtimeSubmitHrNotifyFlex(options: {
  employeeName: string
  department: string | null
  workDate: string
  startTime: string
  endTime: string
  reason: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const adminUrl = baseUrl ? `${baseUrl}/admin/overtime` : undefined

  return flexMessage(
    t("line.otHr.alt", locale, { name: options.employeeName }),
    simpleBubble({
      title: t("line.otHr.title", locale),
      accentColor: BRAND_RED,
      rows: [
        { label: t("line.common.employee", locale), value: options.employeeName },
        { label: t("line.common.department", locale), value: options.department ?? "—" },
        { label: t("line.common.date", locale), value: options.workDate },
        {
          label: t("line.common.time", locale),
          value: `${options.startTime} – ${options.endTime}`,
        },
        { label: t("line.common.reason", locale), value: options.reason },
      ],
      button: adminUrl
        ? { label: t("line.otHr.button", locale), uri: adminUrl }
        : undefined,
    })
  )
}

export function overtimeResultFlex(options: {
  workDate: string
  approved: boolean
  note?: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  return flexMessage(
    options.approved
      ? t("line.otResult.approvedAlt", locale)
      : t("line.otResult.rejectedAlt", locale),
    simpleBubble({
      title: options.approved
        ? t("line.otResult.approvedTitle", locale)
        : t("line.otResult.rejectedTitle", locale),
      accentColor: "#E65100",
      rows: [
        { label: t("line.common.date", locale), value: options.workDate },
        {
          label: t("line.common.result", locale),
          value: options.approved
            ? t("line.status.approved", locale)
            : t("line.status.rejected", locale),
          valueColor: options.approved ? "#16A34A" : "#DC2626",
        },
        ...(options.note
          ? [{ label: t("line.common.note", locale), value: options.note }]
          : []),
      ],
    })
  )
}
