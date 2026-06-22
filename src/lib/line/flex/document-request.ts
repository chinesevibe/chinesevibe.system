import type { messagingApi } from "@line/bot-sdk"

import {
  DOC_TYPES,
  type DocStatus,
  type DocType,
} from "@/features/documents/types"
import { t, type MessageKey } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import { BRAND_RED } from "@/lib/line/brand"
import { flexMessage, simpleBubble } from "@/lib/line/flex/base"
import {
  approvalButtonFooter,
  buildApprovalPostbackData,
  type PostbackButtonSpec,
} from "@/lib/line/approval/flex-buttons"
import { publicBaseUrl } from "@/lib/i18n/liff-url"

function docTypeLabel(type: string, locale: AppLocale): string {
  if (!DOC_TYPES.includes(type as DocType)) return type
  return t(`doc.type.${type}` as MessageKey, locale)
}

function docStatusLabel(status: DocStatus, locale: AppLocale): string {
  const keys: Record<DocStatus, MessageKey> = {
    pending: "line.status.pendingProcessing",
    on_hold: "line.status.onHold",
    processing: "line.status.processing",
    ready: "line.status.ready",
    completed: "line.status.completed",
    rejected: "line.status.rejected",
  }
  return t(keys[status], locale)
}

export function documentSubmitConfirmFlex(options: {
  employeeName: string
  docType: DocType
  copies: number
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  return flexMessage(
    t("line.docSubmit.alt", locale),
    simpleBubble({
      title: t("line.docSubmit.title", locale),
      accentColor: "#7B1FA2",
      rows: [
        { label: t("line.common.employee", locale), value: options.employeeName },
        {
          label: t("line.common.type", locale),
          value: docTypeLabel(options.docType, locale),
        },
        {
          label: t("line.common.copies", locale),
          value: `${options.copies} ${t("line.common.copyUnit", locale)}`,
        },
        {
          label: t("line.common.status", locale),
          value: t("line.status.pendingProcessing", locale),
          valueColor: "#F59E0B",
        },
      ],
      footerNote: t("line.docSubmit.footer", locale),
    })
  )
}

function documentActionButtons(
  docId: string,
  status: DocStatus,
  locale: AppLocale
): PostbackButtonSpec[] {
  const approveLabel =
    status === "processing"
      ? t("line.approval.docReady", locale)
      : status === "ready"
        ? t("line.approval.docComplete", locale)
        : t("line.approval.docAccept", locale)

  const buttons: PostbackButtonSpec[] = [
    {
      label: approveLabel,
      data: buildApprovalPostbackData("approve_document", "doc_id", docId),
      style: "primary",
      color: "#7B1FA2",
      displayText: approveLabel,
    },
  ]

  if (status === "pending" || status === "on_hold") {
    buttons.push({
      label: t("line.approval.docHold", locale),
      data: buildApprovalPostbackData("hold_document", "doc_id", docId),
      style: "secondary",
      displayText: t("line.approval.docHold", locale),
    })
    buttons.push({
      label: t("line.approval.reject", locale),
      data: buildApprovalPostbackData("reject_document", "doc_id", docId),
      style: "secondary",
      displayText: t("line.approval.rejectDisplay", locale),
    })
  }

  return buttons
}

export function documentSubmitHrNotifyFlex(options: {
  docId: string
  status?: DocStatus
  employeeName: string
  department: string | null
  docType: DocType
  copies: number
  purpose: string
  adminUrl?: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const status = options.status ?? "pending"
  const baseUrl = publicBaseUrl()
  const adminUrl =
    options.adminUrl ?? (baseUrl ? `${baseUrl}/admin/documents` : undefined)

  const bubble = simpleBubble({
    title: t("line.docHr.title", locale),
    accentColor: BRAND_RED,
    rows: [
      { label: t("line.common.employee", locale), value: options.employeeName },
      { label: t("line.common.department", locale), value: options.department ?? "—" },
      {
        label: t("line.common.type", locale),
        value: docTypeLabel(options.docType, locale),
      },
      {
        label: t("line.common.copiesShort", locale),
        value: `${options.copies} ${t("line.common.copyUnit", locale)}`,
      },
      { label: t("line.common.purpose", locale), value: options.purpose },
      {
        label: t("line.common.status", locale),
        value: docStatusLabel(status, locale),
      },
    ],
    button: adminUrl
      ? { label: t("line.docHr.button", locale), uri: adminUrl }
      : undefined,
  })

  bubble.footer = approvalButtonFooter(
    documentActionButtons(options.docId, status, locale),
    locale
  )

  return flexMessage(
    t("line.docHr.alt", locale, { name: options.employeeName }),
    bubble
  )
}

export function documentStatusFlex(options: {
  docType: string
  status: DocStatus
  note?: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const typeLabel = docTypeLabel(options.docType, locale)
  const statusLabel = docStatusLabel(options.status, locale)

  return flexMessage(
    t("line.docStatus.alt", locale, { status: statusLabel }),
    simpleBubble({
      title: t("line.docStatus.title", locale),
      accentColor: "#7B1FA2",
      rows: [
        { label: t("line.common.type", locale), value: typeLabel },
        { label: t("line.common.status", locale), value: statusLabel },
        ...(options.note
          ? [{ label: t("line.common.note", locale), value: options.note }]
          : []),
      ],
      footerNote:
        options.status === "ready"
          ? t("line.docStatus.readyFooter", locale)
          : undefined,
    })
  )
}
