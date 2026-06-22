import type { messagingApi } from "@line/bot-sdk"

import {
  brandedTitleHeader,
  cardBody,
  flexMessage,
  menuGuideBubble,
} from "@/lib/line/flex/base"
import { BRAND_RED } from "@/lib/line/brand"
import { liffUrl as buildLiffUrl, publicBaseUrl } from "@/lib/i18n/liff-url"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

function guide(
  altText: string,
  options: Parameters<typeof menuGuideBubble>[0],
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  return flexMessage(altText, menuGuideBubble({ ...options, locale }))
}

export function welcomeFlex(locale: AppLocale = DEFAULT_LOCALE): messagingApi.FlexMessage {
  const welcomeBody: messagingApi.FlexComponent[] = [
          {
            type: "text",
            text: t("line.welcome.intro", locale),
            wrap: true,
            size: "sm",
            color: "#4B5563",
          },
          { type: "separator", margin: "lg" },
          {
            type: "text",
            text: t("line.welcome.menuTitle", locale),
            weight: "bold",
            size: "sm",
            color: "#111827",
          },
          ...menuItemRow("📍", t("line.welcome.checkin", locale), t("line.welcome.checkinDesc", locale)),
          ...menuItemRow("⏱️", t("line.welcome.ot", locale), t("line.welcome.otDesc", locale)),
          ...menuItemRow("📄", t("line.welcome.doc", locale), t("line.welcome.docDesc", locale)),
          ...menuItemRow("📅", t("line.welcome.leave", locale), t("line.welcome.leaveDesc", locale)),
          ...menuItemRow("📢", t("line.welcome.complaint", locale), t("line.welcome.complaintDesc", locale)),
          ...menuItemRow("🎧", t("line.welcome.contact", locale), t("line.welcome.contactDesc", locale)),
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#FFF5F5",
            cornerRadius: "8px",
            paddingAll: "12px",
            contents: [
              {
                type: "text",
                text: t("line.welcome.tipMenu", locale),
                wrap: true,
                size: "xs",
                color: "#B71C1C",
              },
              {
                type: "text",
                text: t("line.welcome.tipStock", locale),
                wrap: true,
                size: "xs",
                color: "#B71C1C",
                margin: "sm",
              },
            ],
          },
  ]

  return flexMessage(t("line.welcome.alt", locale), {
    type: "bubble",
    header: brandedTitleHeader({
      title: t("line.welcome.title", locale),
      subtitle: t("line.welcome.subtitle", locale),
      accentColor: BRAND_RED,
      emoji: "🐼",
    }),
    body: cardBody(welcomeBody),
  })
}

function menuItemRow(
  emoji: string,
  label: string,
  desc: string
): messagingApi.FlexComponent[] {
  return [
    {
      type: "box",
      layout: "horizontal",
      spacing: "md",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: emoji,
          size: "lg",
          flex: 0,
          gravity: "center",
        },
        {
          type: "box",
          layout: "vertical",
          flex: 1,
          contents: [
            {
              type: "text",
              text: label,
              weight: "bold",
              size: "sm",
              color: "#111827",
            },
            {
              type: "text",
              text: desc,
              size: "xs",
              color: "#6B7280",
              wrap: true,
            },
          ],
        },
      ],
    },
  ]
}

export function attendancePickerFlex(
  clockUrl: string | undefined,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  return flexMessage(t("line.attendancePicker.alt", locale), {
    type: "bubble",
    header: brandedTitleHeader({
      title: t("line.attendancePicker.title", locale),
      subtitle: t("line.attendancePicker.subtitle", locale),
      accentColor: BRAND_RED,
      emoji: "⏱️",
    }),
    body: cardBody([
        {
          type: "text",
          text: t("line.attendancePicker.desc", locale),
          wrap: true,
          size: "sm",
          color: "#4B5563",
        },
        {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          margin: "md",
          contents: [
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              backgroundColor: "#ECFDF5",
              cornerRadius: "8px",
              paddingAll: "12px",
              contents: [
                { type: "text", text: "🟢", size: "lg", align: "center" },
                {
                  type: "text",
                  text: t("line.attendancePicker.checkin", locale),
                  weight: "bold",
                  size: "sm",
                  color: "#065F46",
                  align: "center",
                  margin: "xs",
                },
                {
                  type: "text",
                  text: t("line.attendancePicker.shareLocation", locale),
                  size: "xxs",
                  color: "#059669",
                  align: "center",
                },
              ],
            },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              backgroundColor: "#EFF6FF",
              cornerRadius: "8px",
              paddingAll: "12px",
              contents: [
                { type: "text", text: "🔴", size: "lg", align: "center" },
                {
                  type: "text",
                  text: t("line.attendancePicker.checkout", locale),
                  weight: "bold",
                  size: "sm",
                  color: "#1E40AF",
                  align: "center",
                  margin: "xs",
                },
                {
                  type: "text",
                  text: t("line.attendancePicker.shareLocation", locale),
                  size: "xxs",
                  color: "#2563EB",
                  align: "center",
                },
              ],
            },
          ],
        },
        {
          type: "text",
          text: t("line.attendancePicker.footer", locale),
          wrap: true,
          size: "xxs",
          color: "#9CA3AF",
          margin: "sm",
        },
    ]),
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          height: "sm",
          action: clockUrl
            ? ({ type: "uri", label: t("line.attendancePicker.btnCheckin", locale), uri: clockUrl } as messagingApi.URIAction)
            : ({ type: "postback", label: t("line.attendancePicker.btnCheckin", locale), data: "action=checkin_in" } as messagingApi.PostbackAction),
        },
        {
          type: "button",
          style: "primary",
          color: "#1E6FD9",
          height: "sm",
          action: clockUrl
            ? ({ type: "uri", label: t("line.attendancePicker.btnCheckout", locale), uri: clockUrl } as messagingApi.URIAction)
            : ({ type: "postback", label: t("line.attendancePicker.btnCheckout", locale), data: "action=checkout" } as messagingApi.PostbackAction),
        },
      ],
    },
  })
}

export function checkinGuideFlex(
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  return guide(t("line.checkinGuide.alt", locale), {
    emoji: "🟢",
    title: t("line.checkinGuide.title", locale),
    subtitle: t("line.checkinGuide.subtitle", locale),
    accentColor: "#06C755",
    description: t("line.checkinGuide.desc", locale),
    steps: [
      t("line.checkinGuide.step1", locale),
      t("line.checkinGuide.step2", locale),
      t("line.checkinGuide.step3", locale),
    ],
    tip: t("line.checkinGuide.tip", locale),
  }, locale)
}

export function checkoutGuideFlex(
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  return guide(t("line.checkoutGuide.alt", locale), {
    emoji: "🔴",
    title: t("line.checkoutGuide.title", locale),
    subtitle: t("line.checkoutGuide.subtitle", locale),
    accentColor: "#1E6FD9",
    description: t("line.checkoutGuide.desc", locale),
    steps: [
      t("line.checkoutGuide.step1", locale),
      t("line.checkoutGuide.step2", locale),
      t("line.checkoutGuide.step3", locale),
    ],
    tip: t("line.checkoutGuide.tip", locale),
  }, locale)
}

export function outsideGeofenceFlex({
  distanceM,
  limitM,
  locale = DEFAULT_LOCALE,
}: {
  distanceM: number
  limitM: number
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const dist = Math.round(distanceM)
  return guide(t("line.geofence.alt", locale), {
    emoji: "📍",
    title: t("line.geofence.title", locale),
    subtitle: t("line.geofence.desc", locale, { distance: dist, limit: limitM }),
    accentColor: "#EF4444",
    description: t("line.geofence.desc", locale, { distance: dist, limit: limitM }),
    steps: [t("line.geofence.tip", locale)],
    tip: t("line.geofence.tip", locale),
  }, locale)
}

export function alreadyCheckedInFlex(
  timeText: string,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  return guide(t("line.alreadyCheckedIn.alt", locale), {
    emoji: "✅",
    title: t("line.alreadyCheckedIn.title", locale),
    subtitle: t("line.checkin.timeValue", locale, { time: timeText }),
    accentColor: "#059669",
    description: t("line.alreadyCheckedIn.desc", locale, { time: timeText }),
    steps: [t("line.alreadyCheckedIn.desc", locale, { time: timeText })],
    tip: t("line.alreadyCheckedIn.desc", locale, { time: timeText }),
  }, locale)
}

export function notCheckedInFlex(
  locale: AppLocale = DEFAULT_LOCALE,
  retroLiffUrl?: string
): messagingApi.FlexMessage {
  const liffUrl =
    retroLiffUrl ?? buildLiffUrl("/liff/attendance", locale) ?? "/liff/attendance"

  return guide(
    t("line.notCheckedIn.alt", locale),
    {
      emoji: "⚠️",
      title: t("line.notCheckedIn.title", locale),
      subtitle: t("line.notCheckedIn.subtitle", locale),
      accentColor: "#F59E0B",
      description: t("line.notCheckedIn.desc", locale),
      steps: [
        t("line.notCheckedIn.step1", locale),
        t("line.notCheckedIn.step2", locale),
      ],
      tip: t("line.notCheckedIn.tip", locale),
      button: {
        label: t("line.notCheckedIn.retroButton", locale),
        uri: liffUrl,
      },
    },
    locale
  )
}

export function alreadyCheckedOutFlex(
  timeText: string,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  return guide(t("line.alreadyCheckedOut.alt", locale), {
    emoji: "🏁",
    title: t("line.alreadyCheckedOut.title", locale),
    subtitle: t("line.checkin.timeValue", locale, { time: timeText }),
    accentColor: "#6366F1",
    description: t("line.alreadyCheckedOut.desc", locale, { time: timeText }),
    steps: [t("line.alreadyCheckedOut.desc", locale, { time: timeText })],
    tip: t("line.alreadyCheckedOut.desc", locale, { time: timeText }),
  }, locale)
}

export function leaveGuideFlex(
  formUrl?: string,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const hasLiff = Boolean(formUrl)

  return guide(
    hasLiff
      ? t("line.leaveGuide.altReady", locale)
      : t("line.leaveGuide.altSoon", locale),
    {
      emoji: "📅",
      title: t("line.leaveGuide.title", locale),
      subtitle: t("line.leaveGuide.subtitle", locale),
      accentColor: "#1E6FD9",
      description: hasLiff
        ? t("line.leaveGuide.descReady", locale)
        : t("line.leaveGuide.descSoon", locale),
      steps: hasLiff
        ? [
            t("line.leaveGuide.step1Ready", locale),
            t("line.leaveGuide.step2Ready", locale),
            t("line.leaveGuide.step3Ready", locale),
          ]
        : [
            t("line.leaveGuide.step1Soon", locale),
            t("line.leaveGuide.step2Soon", locale),
            t("line.leaveGuide.step3Soon", locale),
          ],
      tip: t("line.leaveGuide.tip", locale),
      ...(hasLiff
        ? {
            button: {
              label: t("line.leaveGuide.button", locale),
              uri: formUrl!,
            },
          }
        : { statusLabel: t("line.leaveGuide.statusSoon", locale) }),
    },
    locale
  )
}

export function overtimeGuideFlex(
  formUrl?: string,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const hasForm = Boolean(formUrl)

  return guide(
    hasForm ? t("line.otGuide.altReady", locale) : t("line.otGuide.altSoon", locale),
    {
      emoji: "⏰",
      title: t("line.otGuide.title", locale),
      subtitle: t("line.otGuide.subtitle", locale),
      accentColor: "#E65100",
      description: hasForm
        ? t("line.otGuide.descReady", locale)
        : t("line.otGuide.descSoon", locale),
      steps: hasForm
        ? [
            t("line.otGuide.step1Ready", locale),
            t("line.otGuide.step2Ready", locale),
            t("line.otGuide.step3Ready", locale),
          ]
        : [
            t("line.otGuide.step1Soon", locale),
            t("line.otGuide.step2Soon", locale),
            t("line.otGuide.step3Soon", locale),
          ],
      tip: t("line.otGuide.tip", locale),
      ...(hasForm && formUrl
        ? { button: { label: t("line.otGuide.button", locale), uri: formUrl } }
        : { statusLabel: t("line.otGuide.statusSoon", locale) }),
    },
    locale
  )
}

export function documentGuideFlex(
  formUrl?: string,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const hasForm = Boolean(formUrl)

  return guide(
    hasForm ? t("line.docGuide.altReady", locale) : t("line.docGuide.altSoon", locale),
    {
      emoji: "📄",
      title: t("line.docGuide.title", locale),
      subtitle: t("line.docGuide.subtitle", locale),
      accentColor: "#7B1FA2",
      description: hasForm
        ? t("line.docGuide.descReady", locale)
        : t("line.docGuide.descSoon", locale),
      steps: hasForm
        ? [
            t("line.docGuide.step1Ready", locale),
            t("line.docGuide.step2Ready", locale),
            t("line.docGuide.step3Ready", locale),
          ]
        : [
            t("line.docGuide.step1Soon", locale),
            t("line.docGuide.step2Soon", locale),
            t("line.docGuide.step3Soon", locale),
          ],
      tip: t("line.docGuide.tip", locale),
      ...(hasForm && formUrl
        ? {
            button: { label: t("line.docGuide.button", locale), uri: formUrl },
          }
        : { statusLabel: t("line.docGuide.statusSoon", locale) }),
    },
    locale
  )
}

export function complaintGuideFlex(
  formUrl?: string,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const hasForm = Boolean(formUrl)

  return guide(
    hasForm
      ? t("line.complaintGuide.altReady", locale)
      : t("line.complaintGuide.altSoon", locale),
    {
      emoji: "📢",
      title: t("line.complaintGuide.title", locale),
      subtitle: t("line.complaintGuide.subtitle", locale),
      accentColor: "#F57C00",
      description: hasForm
        ? t("line.complaintGuide.descReady", locale)
        : t("line.complaintGuide.descSoon", locale),
      steps: hasForm
        ? [
            t("line.complaintGuide.step1Ready", locale),
            t("line.complaintGuide.step2Ready", locale),
            t("line.complaintGuide.step3Ready", locale),
          ]
        : [
            t("line.complaintGuide.step1Soon", locale),
            t("line.complaintGuide.step2Soon", locale),
            t("line.complaintGuide.step3Soon", locale),
          ],
      tip: t("line.complaintGuide.tip", locale),
      ...(hasForm && formUrl
        ? {
            button: { label: t("line.complaintGuide.button", locale), uri: formUrl },
          }
        : { statusLabel: t("line.complaintGuide.statusSoon", locale) }),
    },
    locale
  )
}

export function announcementGuideFlex(
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const base = publicBaseUrl()
  const portalUrl = base ? `${base}/portal?lang=${locale}` : undefined

  return guide(t("line.announcementGuide.alt", locale), {
    emoji: "📣",
    title: t("line.announcementGuide.title", locale),
    subtitle: t("line.announcementGuide.subtitle", locale),
    accentColor: "#00897B",
    description: t("line.announcementGuide.desc", locale),
    steps: [
      t("line.announcementGuide.step1", locale),
      t("line.announcementGuide.step2", locale),
      t("line.announcementGuide.step3", locale),
    ],
    tip: t("line.announcementGuide.tip", locale),
    ...(portalUrl
      ? { button: { label: t("line.announcementGuide.button", locale), uri: portalUrl } }
      : { statusLabel: t("line.announcementGuide.statusPortal", locale) }),
  }, locale)
}

export function checkStockGuideFlex(
  options: {
    stockUrl?: string
    inboundUrl?: string
  },
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const { stockUrl, inboundUrl } = options
  const hasStock = Boolean(stockUrl)
  const hasInbound = Boolean(inboundUrl)

  const footerButtons: messagingApi.FlexComponent[] = []
  if (hasStock) {
    footerButtons.push({
      type: "button",
      style: "primary",
      color: "#4F46E5",
      height: "sm",
      action: {
        type: "uri",
        label: t("line.stockGuide.btnStock", locale),
        uri: stockUrl!,
      },
    })
  }
  if (hasInbound) {
    footerButtons.push({
      type: "button",
      style: "secondary",
      height: "sm",
      action: {
        type: "uri",
        label: t("line.stockGuide.btnInbound", locale),
        uri: inboundUrl!,
      },
    })
  }

  return flexMessage(
    hasStock
      ? t("line.stockGuide.altReady", locale)
      : t("line.stockGuide.altSoon", locale),
    {
      type: "bubble",
      header: brandedTitleHeader({
        title: t("line.stockGuide.title", locale),
        subtitle: t("line.stockGuide.subtitle", locale),
        accentColor: "#4F46E5",
        emoji: "📦",
      }),
      body: cardBody([
        {
          type: "text",
          text: hasStock
            ? t("line.stockGuide.descReady", locale)
            : t("line.stockGuide.descSoon", locale),
          wrap: true,
          size: "sm",
          color: "#4B5563",
        },
      ]),
      ...(footerButtons.length > 0
        ? {
            footer: {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              paddingAll: "12px",
              contents: footerButtons,
            },
          }
        : {}),
    }
  )
}

export function inventoryGuideFlex(
  portalUrl?: string,
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const hasPortal = Boolean(portalUrl)

  return guide(
    hasPortal
      ? t("line.inventoryGuide.altReady", locale)
      : t("line.inventoryGuide.altSoon", locale),
    {
      emoji: "📦",
      title: t("line.inventoryGuide.title", locale),
      subtitle: t("line.inventoryGuide.subtitle", locale),
      accentColor: "#1565C0",
      description: hasPortal
        ? t("line.inventoryGuide.descReady", locale)
        : t("line.inventoryGuide.descSoon", locale),
      steps: hasPortal
        ? [
            t("line.inventoryGuide.step1Ready", locale),
            t("line.inventoryGuide.step2Ready", locale),
            t("line.inventoryGuide.step3Ready", locale),
          ]
        : [
            t("line.inventoryGuide.step1Soon", locale),
            t("line.inventoryGuide.step2Soon", locale),
            t("line.inventoryGuide.step3Soon", locale),
          ],
      tip: t("line.inventoryGuide.tip", locale),
      ...(hasPortal && portalUrl
        ? { button: { label: t("line.inventoryGuide.button", locale), uri: portalUrl } }
        : { statusLabel: t("line.inventoryGuide.statusSoon", locale) }),
    },
    locale
  )
}

function lineRegisterUrl(locale: AppLocale): string {
  const baseUrl = publicBaseUrl()
  const params = new URLSearchParams({ lang: locale })
  const query = params.toString()
  const path = `/api/auth/line/start${query ? `?${query}` : ""}`
  return baseUrl ? `${baseUrl}${path}` : path
}

export function notRegisteredFlex(locale: AppLocale = DEFAULT_LOCALE): messagingApi.FlexMessage {
  const registerUrl = lineRegisterUrl(locale)
  return guide(t("line.notRegistered.alt", locale), {
    emoji: "⚠️",
    title: t("line.notRegistered.title", locale),
    subtitle: t("line.notRegistered.subtitle", locale),
    accentColor: "#EF4444",
    description: t("line.notRegistered.desc", locale),
    steps: [
      t("line.notRegistered.step1", locale),
      t("line.notRegistered.step2", locale),
      t("line.notRegistered.step3", locale),
    ],
    tip: t("line.notRegistered.tip", locale),
    button: { label: t("line.notRegistered.button", locale), uri: registerUrl },
  }, locale)
}

export function pendingApprovalFlex(locale: AppLocale = DEFAULT_LOCALE): messagingApi.FlexMessage {
  return guide(t("line.pending.alt", locale), {
    emoji: "⏳",
    title: t("line.pending.title", locale),
    subtitle: t("line.pending.subtitle", locale),
    accentColor: "#F59E0B",
    description: t("line.pending.desc", locale),
    steps: [
      t("line.pending.step1", locale),
      t("line.pending.step2", locale),
      t("line.pending.step3", locale),
    ],
    tip: t("line.pending.tip", locale),
  }, locale)
}

export function menuHintFlex(locale: AppLocale = DEFAULT_LOCALE): messagingApi.FlexMessage {
  return guide(t("line.menuHint.alt", locale), {
    emoji: "👋",
    title: t("line.menuHint.title", locale),
    subtitle: t("line.menuHint.subtitle", locale),
    accentColor: BRAND_RED,
    description: t("line.menuHint.desc", locale),
    steps: [
      t("line.menuHint.step1", locale),
      t("line.menuHint.step2", locale),
      t("line.menuHint.step3", locale),
    ],
    tip: t("line.menuHint.tip", locale),
  }, locale)
}

export function contactHrGuideFlex(
  locale: AppLocale = DEFAULT_LOCALE
): messagingApi.FlexMessage {
  const registerUrl = lineRegisterUrl(locale)
  return guide(t("line.contactHrGuide.alt", locale), {
    emoji: "🎧",
    title: t("line.contactHrGuide.title", locale),
    subtitle: t("line.contactHrGuide.subtitle", locale),
    accentColor: "#5C6BC0",
    description: t("line.contactHrGuide.desc", locale),
    steps: [
      t("line.contactHrGuide.step1", locale),
      t("line.contactHrGuide.step2", locale),
      t("line.contactHrGuide.step3", locale),
    ],
    tip: t("line.contactHrGuide.tip", locale),
    postbackButton: {
      label: t("line.contactHrGuide.notifyButton", locale),
      data: "action=contact_hr_notify",
    },
    button: {
      label: t("line.contactHrGuide.registerButton", locale),
      uri: registerUrl,
    },
  }, locale)
}
