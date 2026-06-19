import type { messagingApi } from "@line/bot-sdk"

import type { HrApprovalCounts } from "@/features/notifications/nav-badges"
import { BRAND_RED, cardBody, brandedTitleHeader, flexMessage } from "@/lib/line/flex/base"
import { t } from "@/lib/i18n/translate"
import type { AppLocale } from "@/lib/i18n/types"

function countLine(
  label: string,
  count: number,
  locale: AppLocale
): messagingApi.FlexComponent {
  return {
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: label,
        size: "sm",
        color: "#374151",
        flex: 1,
      },
      {
        type: "text",
        text: t("line.pendingQueue.items", locale, { count: String(count) }),
        size: "sm",
        color: count > 0 ? BRAND_RED : "#9CA3AF",
        align: "end",
        weight: count > 0 ? "bold" : "regular",
      },
    ],
  }
}

export function pendingQueueLiffFlex(
  liffUrl: string,
  counts: HrApprovalCounts,
  total: number,
  locale: AppLocale
): messagingApi.FlexMessage {
  const regTotal = counts.registration + counts.onboarding

  return flexMessage(t("line.pendingQueue.alt", locale), {
    type: "bubble",
    size: "mega",
    header: brandedTitleHeader({
      title: t("line.pendingQueue.alt", locale),
      subtitle: t("line.pendingQueue.items", locale, { count: String(total) }),
      accentColor: BRAND_RED,
      emoji: "📋",
    }),
    body: cardBody([
      {
        type: "text",
        text: t("liff.approvals.lineIntro", locale),
        size: "sm",
        color: "#4B5563",
        wrap: true,
      },
      { type: "separator", margin: "lg" },
      countLine(t("line.pendingQueue.registration", locale), regTotal, locale),
      countLine(t("line.pendingQueue.leave", locale), counts.leaveHr, locale),
      countLine(t("line.pendingQueue.overtime", locale), counts.overtime, locale),
      countLine(t("line.pendingQueue.document", locale), counts.document, locale),
      countLine(t("line.pendingQueue.complaint", locale), counts.complaint, locale),
      countLine(t("line.pendingQueue.attendance", locale), counts.attendance, locale),
    ]),
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: BRAND_RED,
          height: "sm",
          action: {
            type: "uri",
            label: t("line.approval.pendingQueueDisplay", locale),
            uri: liffUrl,
          },
        },
      ],
    },
  })
}
