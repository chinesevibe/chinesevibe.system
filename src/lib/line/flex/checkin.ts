import type { messagingApi } from "@line/bot-sdk"

import {
  brandedTitleHeader,
  cardBody,
  flexMessage,
} from "@/lib/line/flex/base"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"
import type { AttendanceMonthSummary } from "@/lib/attendance/month-summary"

function summaryLabels(locale: AppLocale) {
  switch (locale) {
    case "en":
      return { month: "This month summary", days: "Worked days", hours: "Total hours", hoursUnit: "hrs" }
    case "zh":
      return { month: "本月汇总", days: "出勤天数", hours: "累计工时", hoursUnit: "小时" }
    case "my":
      return { month: "ဤလအကျဉ်းချုပ်", days: "အလုပ်ဆင်းရက်", hours: "စုစုပေါင်းနာရီ", hoursUnit: "နာရီ" }
    default:
      return { month: "สรุปเดือนนี้", days: "จำนวนวันที่ทำ", hours: "ชั่วโมงสะสม", hoursUnit: "ชม." }
  }
}

function slipLabels(locale: AppLocale) {
  switch (locale) {
    case "en":
      return { title: "Check-in Slip", note: "Attendance recorded successfully." }
    case "zh":
      return { title: "签到小票", note: "考勤记录已成功保存。" }
    case "my":
      return { title: "တက်ရောက်ချိန် စလစ်", note: "တက်ရောက်မှုမှတ်တမ်းကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။" }
    default:
      return { title: "สลิปเวลาเข้างาน", note: "บันทึกเวลาเข้างานเรียบร้อยแล้ว" }
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
  tone: "green" | "amber" | "slate" = "slate"
): messagingApi.FlexBox {
  const palette =
    tone === "green"
      ? { bg: "#F0FDF4", value: "#15803D" }
      : tone === "amber"
        ? { bg: "#FFF7ED", value: "#C2410C" }
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

export function checkinConfirmFlex({
  name,
  timeText,
  lateMinutes,
  monthSummary,
  locale = DEFAULT_LOCALE,
}: {
  name: string
  timeText: string
  lateMinutes: number
  monthSummary: AttendanceMonthSummary
  locale?: AppLocale
}): messagingApi.FlexMessage {
  const isLate = lateMinutes > 0
  const labels = summaryLabels(locale)
  const slip = slipLabels(locale)
  const statusText = isLate
    ? t("line.checkin.late", locale, { minutes: lateMinutes })
    : t("line.checkin.onTime", locale)
  const accentColor = isLate ? "#F39C12" : "#06C755"

  return flexMessage(
    t("line.checkin.alt", locale, { time: timeText }),
    {
      type: "bubble",
      size: "giga",
      header: brandedTitleHeader({
        title: isLate
          ? t("line.checkin.lateTitle", locale)
          : t("line.checkin.title", locale),
        subtitle: t("line.checkin.timeValue", locale, { time: timeText }),
        accentColor,
        emoji: isLate ? "⚠️" : "✅",
        statusLabel: statusText,
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
              t("line.checkin.time", locale),
              t("line.checkin.timeValue", locale, { time: timeText })
            ),
            detailRow(t("line.checkin.status", locale), statusText, accentColor),
          ],
        },
        {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          margin: "md",
          contents: [
            statCard(t("line.checkin.time", locale), timeText, "green"),
            statCard(t("line.checkin.status", locale), statusText, isLate ? "amber" : "green"),
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
              contents: [
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
              color: "#6B7280",
              wrap: true,
            },
          ],
        },
      ]),
    }
  )
}
