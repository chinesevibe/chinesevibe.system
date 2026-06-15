import type { messagingApi } from "@line/bot-sdk"

import {
  countLeaveDays,
  type LeaveType,
} from "@/features/leave/types"
import { t, type MessageKey } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import { flexMessage, simpleBubble } from "@/lib/line/flex/base"

function leaveTypeLabel(type: LeaveType, locale: AppLocale): string {
  return t(`leave.type.${type}` as MessageKey, locale)
}

export function leaveApprovedFlex(options: {
  type: LeaveType
  startDate: string
  endDate: string
  remainingDays: number | null
  note?: string | null
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const days = countLeaveDays(options.startDate, options.endDate) ?? 0
  const rows = [
    {
      label: t("line.common.result", locale),
      value: t("line.status.approved", locale),
      valueColor: "#16A34A",
    },
    { label: t("line.common.type", locale), value: leaveTypeLabel(options.type, locale) },
    { label: t("line.common.date", locale), value: `${options.startDate} – ${options.endDate}` },
    {
      label: t("line.common.days", locale),
      value: `${days} ${t("line.common.dayUnit", locale)}`,
    },
  ]
  if (options.remainingDays !== null) {
    rows.push({
      label: t("line.common.remaining", locale),
      value: `${options.remainingDays} ${t("line.common.dayUnit", locale)}`,
    })
  }
  if (options.note) {
    rows.push({ label: t("line.common.hrNote", locale), value: options.note })
  }

  return flexMessage(
    t("line.leaveResult.approvedAlt", locale),
    simpleBubble({
      title: t("line.leaveResult.approvedTitle", locale),
      accentColor: "#16A34A",
      rows,
    })
  )
}

export function leaveRejectedFlex(options: {
  type: LeaveType
  startDate: string
  endDate: string
  reason: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const days = countLeaveDays(options.startDate, options.endDate) ?? 0
  return flexMessage(
    t("line.leaveResult.rejectedAlt", locale),
    simpleBubble({
      title: t("line.leaveResult.rejectedTitle", locale),
      accentColor: "#DC2626",
      rows: [
        {
          label: t("line.common.result", locale),
          value: t("line.status.rejected", locale),
          valueColor: "#DC2626",
        },
        { label: t("line.common.type", locale), value: leaveTypeLabel(options.type, locale) },
        { label: t("line.common.date", locale), value: `${options.startDate} – ${options.endDate}` },
        {
          label: t("line.common.days", locale),
          value: `${days} ${t("line.common.dayUnit", locale)}`,
        },
        { label: t("line.common.reason", locale), value: options.reason },
      ],
    })
  )
}
