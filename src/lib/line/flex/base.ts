import type { messagingApi } from "@line/bot-sdk"

import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import { BRAND_RED } from "@/lib/line/brand"

const LABEL_COLOR = "#6B7280"
const VALUE_COLOR = "#111111"

export { BRAND_RED }

function emojiCircle(emoji: string): messagingApi.FlexComponent {
  return {
    type: "box",
    layout: "vertical",
    width: "52px",
    height: "52px",
    cornerRadius: "26px",
    backgroundColor: "#FFFFFF33",
    justifyContent: "center",
    alignItems: "center",
    contents: [
      { type: "text", text: emoji, size: "xxl", align: "center" },
    ],
  }
}

export function cardBody(
  contents: messagingApi.FlexComponent[],
  paddingAll = "16px"
): messagingApi.FlexBox {
  return {
    type: "box",
    layout: "vertical",
    paddingAll,
    contents,
  }
}

export function brandedTitleHeader(options: {
  title: string
  subtitle?: string
  accentColor: string
  emoji: string
  statusLabel?: string
}): messagingApi.FlexBox {
  const { title, subtitle, accentColor, emoji, statusLabel } = options

  const contents: messagingApi.FlexComponent[] = [
    {
      type: "box",
      layout: "horizontal",
      contents: [
        emojiCircle(emoji),
        {
          type: "box",
          layout: "vertical",
          flex: 1,
          paddingStart: "14px",
          justifyContent: "center",
          contents: [
            {
              type: "text",
              text: title,
              weight: "bold",
              size: "lg",
              color: "#FFFFFF",
            },
            ...(subtitle
              ? [
                  {
                    type: "text" as const,
                    text: subtitle,
                    size: "xs" as const,
                    color: "#FFFFFFCC",
                    margin: "xs" as const,
                    wrap: true,
                  },
                ]
              : []),
          ],
        },
      ],
    },
  ]

  if (statusLabel) {
    contents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#FFFFFF22",
          cornerRadius: "12px",
          paddingAll: "6px",
          paddingStart: "10px",
          paddingEnd: "10px",
          contents: [
            {
              type: "text",
              text: statusLabel,
              size: "xxs",
              color: "#FFFFFF",
              weight: "bold",
            },
          ],
        },
      ],
    })
  }

  return {
    type: "box",
    layout: "vertical",
    backgroundColor: accentColor,
    paddingAll: "18px",
    contents,
  }
}

export type BubbleRow = {
  label: string
  value: string
  valueColor?: string
}

type SimpleBubbleOptions = {
  title: string
  accentColor: string
  lines?: string[]
  rows?: BubbleRow[]
  footerNote?: string
  button?: { label: string; uri: string }
  postbackButton?: { label: string; data: string }
  /** Wider bubble + roomier body text (announcements). */
  wide?: boolean
}

function textLine(
  text: string,
  size: messagingApi.FlexText["size"] = "sm"
): messagingApi.FlexComponent {
  return {
    type: "text",
    text,
    wrap: true,
    size,
    color: "#333333",
    align: "start",
  }
}

function kvRow({ label, value, valueColor }: BubbleRow): messagingApi.FlexComponent {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      { type: "text", text: label, size: "sm", color: LABEL_COLOR, flex: 2 },
      {
        type: "text",
        text: value,
        size: "sm",
        color: valueColor ?? VALUE_COLOR,
        weight: "bold",
        wrap: true,
        flex: 3,
        align: "end",
      },
    ],
  }
}

export function simpleBubble({
  title,
  accentColor,
  lines,
  rows,
  footerNote,
  button,
  postbackButton,
  wide = false,
}: SimpleBubbleOptions): messagingApi.FlexBubble {
  const lineSize: messagingApi.FlexText["size"] = wide ? "md" : "sm"
  const bodyContents: messagingApi.FlexComponent[] = [
    ...(lines ?? []).map((line) => textLine(line, lineSize)),
    ...(rows ?? []).map(kvRow),
  ]

  if (footerNote) {
    bodyContents.push(
      { type: "separator", margin: "md" },
      {
        type: "text",
        text: footerNote,
        size: "xs",
        color: "#F39C12",
        wrap: true,
        margin: "md",
      }
    )
  }

  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    ...(wide ? { size: "giga" as const } : {}),
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: accentColor,
      paddingAll: wide ? "14px" : "16px",
      contents: [
        {
          type: "text",
          text: title,
          weight: "bold",
          size: wide ? "xl" : "lg",
          color: "#FFFFFF",
          wrap: true,
        },
      ],
    },
    body: cardBody(bodyContents, wide ? "12px" : "16px"),
  }

  if (button || postbackButton) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: accentColor,
          action: postbackButton
            ? {
                type: "postback",
                label: postbackButton.label,
                data: postbackButton.data,
              }
            : { type: "uri", label: button!.label, uri: button!.uri },
        },
      ],
    }
  }

  return bubble
}

export function flexMessage(
  altText: string,
  bubble: messagingApi.FlexBubble
): messagingApi.FlexMessage {
  return { type: "flex", altText, contents: bubble }
}

export type MenuGuideOptions = {
  emoji: string
  title: string
  subtitle: string
  accentColor: string
  description: string
  steps: string[]
  tip?: string
  locale?: AppLocale
  statusLabel?: string
  button?: { label: string; uri: string }
  postbackButton?: { label: string; data: string }
}

function stepRow(
  index: number,
  text: string,
  accentColor: string
): messagingApi.FlexComponent {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    margin: index === 0 ? "none" : "sm",
    contents: [
      {
        type: "box",
        layout: "vertical",
        width: "22px",
        height: "22px",
        cornerRadius: "11px",
        backgroundColor: accentColor,
        justifyContent: "center",
        alignItems: "center",
        contents: [
          {
            type: "text",
            text: String(index + 1),
            size: "xxs",
            color: "#FFFFFF",
            weight: "bold",
            align: "center",
          },
        ],
      },
      {
        type: "text",
        text,
        flex: 1,
        wrap: true,
        size: "sm",
        color: "#374151",
        gravity: "center",
      },
    ],
  }
}

export function menuGuideBubble({
  emoji,
  title,
  subtitle,
  accentColor,
  description,
  steps,
  tip,
  locale = DEFAULT_LOCALE,
  statusLabel,
  button,
  postbackButton,
}: MenuGuideOptions): messagingApi.FlexBubble {
  const bodyContents: messagingApi.FlexComponent[] = [
    {
      type: "text",
      text: description,
      wrap: true,
      size: "sm",
      color: "#4B5563",
    },
    { type: "separator", margin: "lg" },
    {
      type: "text",
      text: t("line.common.howTo", locale),
      weight: "bold",
      size: "sm",
      color: "#111827",
      margin: "md",
    },
    ...steps.map((step, i) => stepRow(i, step, accentColor)),
  ]

  if (tip) {
    bodyContents.push(
      { type: "separator", margin: "lg" },
      {
        type: "box",
        layout: "vertical",
        backgroundColor: "#F9FAFB",
        cornerRadius: "8px",
        paddingAll: "12px",
        margin: "md",
        contents: [
          {
            type: "text",
            text: `💡 ${tip}`,
            wrap: true,
            size: "xs",
            color: "#6B7280",
          },
        ],
      }
    )
  }

  const bubble: messagingApi.FlexBubble = {
    type: "bubble",
    header: brandedTitleHeader({
      title,
      subtitle,
      accentColor,
      emoji,
      statusLabel,
    }),
    body: cardBody(bodyContents),
  }

  if (button || postbackButton) {
    const footerButtons: messagingApi.FlexComponent[] = []
    if (postbackButton) {
      footerButtons.push({
        type: "button",
        style: "primary",
        color: accentColor,
        height: "sm",
        action: {
          type: "postback",
          label: postbackButton.label,
          data: postbackButton.data,
        },
      })
    }
    if (button) {
      footerButtons.push({
        type: "button",
        style: postbackButton ? "secondary" : "primary",
        color: postbackButton ? undefined : accentColor,
        height: "sm",
        action: { type: "uri", label: button.label, uri: button.uri },
      })
    }
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "12px",
      contents: footerButtons,
    }
  }

  return bubble
}
