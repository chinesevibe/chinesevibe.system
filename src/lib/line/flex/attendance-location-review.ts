import type { messagingApi } from "@line/bot-sdk"

import { formatIctTime } from "@/lib/attendance/late"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import {
  approvalButtonFooter,
  buildApprovalPostbackData,
  type PostbackButtonSpec,
} from "@/lib/line/approval/flex-buttons"
import { cardBody, flexMessage, brandedTitleHeader } from "@/lib/line/flex/base"

export function attendanceLocationReviewFlex(options: {
  attendanceId: string
  employeeName: string
  department: string | null
  checkInAt: string | Date
  flags: string[]
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const timeText =
    options.checkInAt instanceof Date
      ? formatIctTime(options.checkInAt)
      : formatIctTime(new Date(options.checkInAt))

  const buttons: PostbackButtonSpec[] = [
    {
      label: t("line.approval.approve", locale),
      data: buildApprovalPostbackData(
        "approve_attendance",
        "attendance_id",
        options.attendanceId
      ),
      style: "primary",
      color: "#059669",
      displayText: t("line.approval.approveDisplay", locale),
    },
    {
      label: t("line.approval.reject", locale),
      data: buildApprovalPostbackData(
        "reject_attendance",
        "attendance_id",
        options.attendanceId
      ),
      style: "secondary",
      displayText: t("line.approval.rejectDisplay", locale),
    },
  ]

  return flexMessage(
    t("line.attendanceReview.alt", locale, { name: options.employeeName }),
    {
      type: "bubble",
      size: "mega",
      header: brandedTitleHeader({
        title: t("line.attendanceReview.title", locale),
        subtitle: t("line.attendanceReview.subtitle", locale),
        accentColor: "#059669",
        emoji: "📍",
        statusLabel: t("line.attendanceReview.status", locale),
      }),
      body: cardBody([
        {
          type: "box",
          layout: "horizontal",
          margin: "sm",
          contents: [
            {
              type: "text",
              text: t("line.common.employee", locale),
              size: "xs",
              color: "#6B7280",
              flex: 2,
            },
            {
              type: "text",
              text: options.employeeName,
              size: "sm",
              color: "#111111",
              flex: 5,
              wrap: true,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "sm",
          contents: [
            {
              type: "text",
              text: t("line.common.department", locale),
              size: "xs",
              color: "#6B7280",
              flex: 2,
            },
            {
              type: "text",
              text: options.department ?? "—",
              size: "sm",
              color: "#111111",
              flex: 5,
              wrap: true,
            },
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "sm",
          contents: [
            {
              type: "text",
              text: t("line.common.time", locale),
              size: "xs",
              color: "#6B7280",
              flex: 2,
            },
            {
              type: "text",
              text: timeText,
              size: "sm",
              color: "#111111",
              flex: 5,
              wrap: true,
            },
          ],
        },
        {
          type: "text",
          text: options.flags.join(", ") || t("line.attendanceReview.unknownFlags", locale),
          size: "xs",
          color: "#6B7280",
          margin: "lg",
          wrap: true,
        },
      ]),
      footer: approvalButtonFooter(buttons, locale),
    }
  )
}
