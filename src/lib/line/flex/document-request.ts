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

export function documentSubmitHrNotifyFlex(options: {
  employeeName: string
  department: string | null
  docType: DocType
  copies: number
  purpose: string
  adminUrl?: string
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const locale = options.locale ?? DEFAULT_LOCALE
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const adminUrl =
    options.adminUrl ?? (baseUrl ? `${baseUrl}/admin/documents` : undefined)

  return flexMessage(
    t("line.docHr.alt", locale, { name: options.employeeName }),
    simpleBubble({
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
      ],
      button: adminUrl
        ? { label: t("line.docHr.button", locale), uri: adminUrl }
        : undefined,
    })
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
