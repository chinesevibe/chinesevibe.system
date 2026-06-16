import type { messagingApi } from "@line/bot-sdk"

import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

export type PostbackButtonSpec = {
  label: string
  data: string
  style?: "primary" | "secondary" | "link"
  color?: string
  displayText?: string
}

const UUID_RE = /^[0-9a-f-]{36}$/i

export function buildApprovalPostbackData(
  action: string,
  idParam: string,
  id: string
): string {
  return `action=${action}&${idParam}=${id}`
}

export function pendingQueuePostbackData(): string {
  return "action=pending_queue"
}

export function postbackButton(spec: PostbackButtonSpec): messagingApi.FlexComponent {
  return {
    type: "button",
    style: spec.style ?? "primary",
    ...(spec.color ? { color: spec.color } : {}),
    height: "sm",
    flex: 1,
    action: {
      type: "postback",
      label: spec.label,
      data: spec.data,
      ...(spec.displayText ? { displayText: spec.displayText } : {}),
    },
  }
}

export function approvalButtonFooter(
  buttons: PostbackButtonSpec[],
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexBox {
  const queueButton = postbackButton({
    label: t("line.approval.pendingQueue", locale),
    data: pendingQueuePostbackData(),
    style: "link",
    displayText: t("line.approval.pendingQueueDisplay", locale),
  })

  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    paddingAll: "12px",
    contents: [
      {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: buttons.map(postbackButton),
      },
      queueButton,
    ],
  }
}

export function parseUuidParam(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed || !UUID_RE.test(trimmed)) return null
  return trimmed
}
