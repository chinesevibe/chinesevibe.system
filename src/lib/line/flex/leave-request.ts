import type { messagingApi } from "@line/bot-sdk"

import { BRAND_RED } from "@/lib/line/brand"
import { flexMessage, simpleBubble } from "@/lib/line/flex/base"
import {
  approvalButtonFooter,
  buildApprovalPostbackData,
  type PostbackButtonSpec,
} from "@/lib/line/approval/flex-buttons"
import { t, type MessageKey } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import {
  countLeaveDays,
  type LeaveType,
} from "@/features/leave/types"

function leaveTypeLabel(type: LeaveType, locale: AppLocale): string {
  return t(`leave.type.${type}` as MessageKey, locale)
}

export function leaveSubmitConfirmFlex(options: {
  employeeName: string
  type: LeaveType
  startDate: string
  endDate: string
  balanceRemaining?: number | null
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const days = countLeaveDays(options.startDate, options.endDate) ?? 0
  const rows = [
    { label: t("line.common.employee", locale), value: options.employeeName },
    { label: t("line.common.type", locale), value: leaveTypeLabel(options.type, locale) },
    { label: t("line.common.date", locale), value: `${options.startDate} – ${options.endDate}` },
    {
      label: t("line.common.days", locale),
      value: `${days} ${t("line.common.dayUnit", locale)}`,
    },
    ...(options.balanceRemaining != null
      ? [
          {
            label: t("line.common.balance", locale),
            value: `${options.balanceRemaining} ${t("line.common.dayUnit", locale)}`,
          },
        ]
      : []),
    {
      label: t("line.common.status", locale),
      value: t("line.status.pendingHr", locale),
      valueColor: "#F59E0B",
    },
  ]
  return flexMessage(
    t("line.leaveSubmit.alt", locale),
    simpleBubble({
      title: t("line.leaveSubmit.title", locale),
      accentColor: BRAND_RED,
      rows,
      footerNote: t("line.leaveSubmit.footer", locale),
    })
  )
}

export function leaveSubmitHrNotifyFlex(options: {
  leaveId: string
  employeeName: string
  department: string | null
  type: LeaveType
  startDate: string
  endDate: string
  reason: string
  adminUrl?: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const days = countLeaveDays(options.startDate, options.endDate) ?? 0
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const adminUrl =
    options.adminUrl ?? (baseUrl ? `${baseUrl}/admin/leaves` : undefined)

  const buttons: PostbackButtonSpec[] = [
    {
      label: t("line.approval.approve", locale),
      data: buildApprovalPostbackData("approve_leave", "leave_id", options.leaveId),
      style: "primary",
      color: "#2563EB",
      displayText: t("line.approval.approveDisplay", locale),
    },
    {
      label: t("line.approval.reject", locale),
      data: buildApprovalPostbackData("reject_leave", "leave_id", options.leaveId),
      style: "secondary",
      displayText: t("line.approval.rejectDisplay", locale),
    },
  ]

  const bubble = simpleBubble({
    title: t("line.leaveHr.title", locale),
    accentColor: "#2563EB",
    rows: [
      { label: t("line.common.employee", locale), value: options.employeeName },
      { label: t("line.common.department", locale), value: options.department ?? "—" },
      { label: t("line.common.type", locale), value: leaveTypeLabel(options.type, locale) },
      { label: t("line.common.date", locale), value: `${options.startDate} – ${options.endDate}` },
      {
        label: t("line.common.days", locale),
        value: `${days} ${t("line.common.dayUnit", locale)}`,
      },
      { label: t("line.common.reason", locale), value: options.reason },
    ],
    footerNote: t("line.leaveHr.footer", locale),
    button: adminUrl
      ? { label: t("line.leaveHr.button", locale), uri: adminUrl }
      : undefined,
  })

  bubble.footer = approvalButtonFooter(buttons, locale)

  return flexMessage(
    t("line.leaveHr.alt", locale, { name: options.employeeName }),
    bubble
  )
}
