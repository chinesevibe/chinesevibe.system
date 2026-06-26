import type { messagingApi } from "@line/bot-sdk"

import {
  brandedTitleHeader,
  cardBody,
  flexMessage,
} from "@/lib/line/flex/base"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import type { AttendanceMonthSummary } from "@/lib/attendance/month-summary"

function formatDuration(minutes: number, locale: AppLocale): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0
    ? t("line.duration.hoursMinutes", locale, { h, m })
    : t("line.duration.hours", locale, { h })
}

function summaryLabels(locale: AppLocale) {
  switch (locale) {
    case "en":
      return {
        month: "This month summary",
        days: "Worked days",
        otDays: "OT days",
        hours: "Total hours",
        otHours: "Approved OT",
        hoursUnit: "hrs",
      }
    case "zh":
      return {
        month: "本月汇总",
        days: "出勤天数",
        otDays: "加班天数",
        hours: "累计工时",
        otHours: "已批加班",
        hoursUnit: "小时",
      }
    case "my":
      return {
        month: "ဤလအကျဉ်းချုပ်",
        days: "အလုပ်ဆင်းရက်",
        otDays: "OT ရက်",
        hours: "စုစုပေါင်းနာရီ",
        otHours: "OT ခွင့်ပြု",
        hoursUnit: "နာရီ",
      }
    default:
      return {
        month: "สรุปเดือนนี้",
        days: "วันทำงาน",
        otDays: "วัน OT",
        hours: "ชั่วโมงสะสม",
        otHours: "OT อนุมัติ",
        hoursUnit: "ชม.",
      }
  }
}

function slipLabels(locale: AppLocale) {
  switch (locale) {
    case "en":
      return { title: "Time Slip", note: "Attendance recorded successfully." }
    case "zh":
      return { title: "工时小票", note: "考勤记录已成功保存。" }
    case "my":
      return { title: "အချိန်စလစ်", note: "တက်ဆင်းမှတ်တမ်းကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။" }
    default:
      return { title: "สลิปสรุปเวลา", note: "บันทึกเวลาเข้า-ออกเรียบร้อยแล้ว" }
  }
}

function sectionTitle(text: string): messagingApi.FlexText {
  return {
    type: "text",
    text,
    size: "xs",
    color: "#6B7280",
    weight: "bold",
  }
}

function detailRow(label: string, value: string, valueColor = "#111827"): messagingApi.FlexBox {
  return {
    type: "box",
    layout: "horizontal",
    spacing: "sm",
    contents: [
      {
        type: "text",
        text: label,
        size: "sm",
        color: "#6B7280",
        flex: 2,
      },
      {
        type: "text",
        text: value,
        size: "sm",
        color: valueColor,
        weight: "bold",
        flex: 3,
        wrap: true,
        align: "end",
      },
    ],
  }
}

function statCard(
  label: string,
  value: string,
  tone: "blue" | "green" | "slate" = "slate"
): messagingApi.FlexBox {
  const palette =
    tone === "blue"
      ? { bg: "#EFF6FF", value: "#1D4ED8" }
      : tone === "green"
        ? { bg: "#F0FDF4", value: "#15803D" }
        : { bg: "#F8FAFC", value: "#111827" }

  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    backgroundColor: palette.bg,
    cornerRadius: "14px",
    paddingAll: "12px",
    spacing: "4px",
    contents: [
      { type: "text", text: label, size: "xs", color: "#6B7280", wrap: true },
      {
        type: "text",
        text: value,
        size: "lg",
        weight: "bold",
        color: palette.value,
        wrap: true,
      },
    ],
  }
}

export function checkoutSummaryFlex({
  name,
  inText,
  outText,
  workMinutes,
  // overtimeMinutes kept for backward-compat but intentionally ignored — OT
  // is surfaced only via the OT-request flow, not the checkout message.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  overtimeMinutes: _overtimeMinutes,
  showWorkDuration = true,
  monthSummary,
  locale = DEFAULT_LOCALE,
}: {
  name: string
  inText: string
  outText: string
  workMinutes: number
  overtimeMinutes?: number
  showWorkDuration?: boolean
  monthSummary: AttendanceMonthSummary
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const labels = summaryLabels(locale)
  const slip = slipLabels(locale)
  const durationText = formatDuration(workMinutes, locale)

  return flexMessage(
    t("line.checkout.alt", locale, { time: outText }),
    {
      type: "bubble",
      size: "giga",
      header: brandedTitleHeader({
        title: t("line.checkout.title", locale),
        subtitle: t("line.checkin.timeValue", locale, { time: outText }),
        accentColor: "#1E6FD9",
        emoji: "🧾",
        statusLabel: showWorkDuration ? durationText : undefined,
      }),
      body: cardBody([
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#FFFFFF",
          cornerRadius: "16px",
          borderColor: "#E5E7EB",
          borderWidth: "1px",
          paddingAll: "14px",
          spacing: "10px",
          contents: [
            sectionTitle(slip.title),
            detailRow(t("line.checkin.employee", locale), name),
            detailRow(
              t("line.checkout.checkIn", locale),
              t("line.checkin.timeValue", locale, { time: inText })
            ),
            detailRow(
              t("line.checkout.checkOut", locale),
              t("line.checkin.timeValue", locale, { time: outText })
            ),
            ...(showWorkDuration
              ? [detailRow(t("line.checkout.total", locale), durationText, "#1D4ED8")]
              : []),
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          margin: "md",
          contents: [
            statCard(t("line.checkout.checkIn", locale), inText),
            statCard(t("line.checkout.checkOut", locale), outText, "blue"),
            ...(showWorkDuration
              ? [statCard(t("line.checkout.total", locale), durationText, "green")]
              : []),
          ],
        },
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#F8FAFC",
          cornerRadius: "16px",
          paddingAll: "14px",
          margin: "md",
          spacing: "10px",
          contents: [
            sectionTitle(labels.month),
            {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: !showWorkDuration && monthSummary.otDays !== undefined
                // monthly: 3 stat — วันทำงาน / วัน OT / OT อนุมัติ
                ? [
                    statCard(labels.days, String(monthSummary.workDays)),
                    statCard(labels.otDays, String(monthSummary.otDays), "blue"),
                    statCard(
                      labels.otHours,
                      `${monthSummary.totalHours.toFixed(1)} ${labels.hoursUnit}`,
                      "green"
                    ),
                  ]
                // hourly: 2 stat เดิม
                : [
                    statCard(labels.days, String(monthSummary.workDays)),
                    statCard(
                      labels.hours,
                      `${monthSummary.totalHours.toFixed(1)} ${labels.hoursUnit}`
                    ),
                  ],
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#F9FAFB",
          cornerRadius: "12px",
          paddingAll: "12px",
          margin: "md",
          contents: [
            {
              type: "text",
              text: slip.note,
              size: "xs",
              color: "#D97706",
              wrap: true,
            },
          ],
        },
      ]),
    }
  )
}
