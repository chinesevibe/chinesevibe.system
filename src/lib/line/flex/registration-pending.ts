import type { messagingApi } from "@line/bot-sdk"

import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import { BRAND_RED, cardBody, brandedTitleHeader } from "@/lib/line/flex/base"
import {
  approvalButtonFooter,
  buildApprovalPostbackData,
} from "@/lib/line/approval/flex-buttons"

export type RegistrationNotifyPayload = {
  employeeId: string
  employeeCode: string | null
  name: string
  phone: string | null
  branchName: string | null
  department: string | null
  position: string | null
}

function detailRow(label: string, value: string): messagingApi.FlexComponent {
  return {
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: label,
        size: "xs",
        color: "#6B7280",
        flex: 2,
      },
      {
        type: "text",
        text: value,
        size: "sm",
        color: "#111111",
        flex: 5,
        wrap: true,
      },
    ],
  }
}

export function registrationPendingFlex(
  payload: RegistrationNotifyPayload,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const { employeeId, employeeCode, name, phone, branchName, department, position } =
    payload

  return {
    type: "flex",
    altText: t("line.registrationPending.alt", locale, { name }),
    contents: {
      type: "bubble",
      size: "mega",
      header: brandedTitleHeader({
        title: t("line.registrationPending.title", locale),
        subtitle: t("line.registrationPending.subtitle", locale),
        accentColor: BRAND_RED,
        emoji: "📝",
        statusLabel: t("line.registrationPending.status", locale),
      }),
      body: cardBody([
        detailRow(t("line.registrationPending.employeeCode", locale), employeeCode ?? "—"),
        detailRow(t("line.registrationPending.name", locale), name),
        detailRow(t("line.registrationPending.phone", locale), phone ?? "—"),
        detailRow(t("line.registrationPending.branch", locale), branchName ?? "—"),
        ...(department ? [detailRow(t("line.common.department", locale), department)] : []),
        ...(position ? [detailRow(t("line.common.position", locale), position)] : []),
        {
          type: "text",
          text: t("line.registrationPending.help", locale),
          size: "xs",
          color: "#6B7280",
          margin: "lg",
          wrap: true,
        },
      ]),
      footer: approvalButtonFooter(
        [
          {
            label: t("line.registrationPending.approve", locale),
            data: buildApprovalPostbackData(
              "approve_registration",
              "emp_id",
              employeeId
            ),
            style: "primary",
            color: BRAND_RED,
            displayText: t("line.registrationPending.approveDisplay", locale),
          },
          {
            label: t("line.registrationPending.reject", locale),
            data: buildApprovalPostbackData(
              "reject_registration",
              "emp_id",
              employeeId
            ),
            style: "secondary",
            displayText: t("line.registrationPending.rejectDisplay", locale),
          },
        ],
        locale
      ),
    },
  }
}
