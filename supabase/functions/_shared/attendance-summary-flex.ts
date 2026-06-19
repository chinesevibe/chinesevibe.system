/**
 * Flex Message builder สำหรับ shift attendance summary
 * ใช้กับ Supabase Edge Function (Deno) — ไม่ใช้ LINE Bot SDK types
 */

const BRAND_RED = "#E80012"
const GREEN = "#16A34A"
const ORANGE = "#EA580C"
const BLUE = "#2563EB"
const GRAY_LABEL = "#6B7280"
const GRAY_BG = "#F9FAFB"

type FlexComponent = Record<string, unknown>

function statBox(options: {
  emoji: string
  count: string
  label: string
  color: string
  bg: string
}): FlexComponent {
  return {
    type: "box",
    layout: "vertical",
    flex: 1,
    backgroundColor: options.bg,
    cornerRadius: "10px",
    paddingAll: "12px",
    alignItems: "center",
    contents: [
      {
        type: "text",
        text: options.emoji,
        size: "xl",
        align: "center",
      },
      {
        type: "text",
        text: options.count,
        weight: "bold",
        size: "xxl",
        color: options.color,
        align: "center",
        margin: "xs",
      },
      {
        type: "text",
        text: options.label,
        size: "xs",
        color: GRAY_LABEL,
        align: "center",
      },
    ],
  }
}

function nameSection(emoji: string, label: string, names: string[]): FlexComponent[] {
  if (names.length === 0) return []
  const nameText = names.slice(0, 10).join(", ") + (names.length > 10 ? ` +${names.length - 10}` : "")
  return [
    {
      type: "box",
      layout: "horizontal",
      margin: "sm",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: `${emoji} ${label}`,
          size: "xs",
          color: GRAY_LABEL,
          flex: 0,
        },
        {
          type: "text",
          text: nameText,
          size: "xs",
          color: "#374151",
          wrap: true,
          flex: 1,
          weight: "bold",
        },
      ],
    },
  ]
}

export type AttendanceSummaryParams = {
  date: string        // "2026-06-19"
  shiftName: string   // "กะเช้า"
  timeRange: string   // "08:00–17:00"
  total: number
  checkedIn: number
  late: number
  absent: number
  onLeave: number
  lateNames: string[]
  absentNames: string[]
  leaveNames: string[]
}

export function buildAttendanceSummaryFlex(params: AttendanceSummaryParams): {
  type: "flex"
  altText: string
  contents: FlexComponent
} {
  const {
    date,
    shiftName,
    timeRange,
    total,
    checkedIn,
    late,
    absent,
    onLeave,
    lateNames,
    absentNames,
    leaveNames,
  } = params

  // format วันที่ภาษาไทย
  const [y, m, d] = date.split("-").map(Number)
  const thMonth = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."][m - 1]
  const thYear = y + 543
  const dateLabel = `${d} ${thMonth} ${thYear}`

  const absent_plus_late = late + absent

  const bodyContents: FlexComponent[] = [
    // 2x2 stat grid
    {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        statBox({
          emoji: "✅",
          count: `${checkedIn}/${total}`,
          label: "เข้างาน",
          color: GREEN,
          bg: "#F0FDF4",
        }),
        statBox({
          emoji: "⚠️",
          count: String(late),
          label: "มาสาย",
          color: ORANGE,
          bg: "#FFF7ED",
        }),
      ],
    },
    {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      margin: "sm",
      contents: [
        statBox({
          emoji: "❌",
          count: String(absent),
          label: "ขาด",
          color: BRAND_RED,
          bg: "#FEF2F2",
        }),
        statBox({
          emoji: "📋",
          count: String(onLeave),
          label: "ลา",
          color: BLUE,
          bg: "#EFF6FF",
        }),
      ],
    },
  ]

  // Name lists (only if there are issues)
  const nameSections: FlexComponent[] = [
    ...nameSection("⚠️", "สาย:", lateNames),
    ...nameSection("❌", "ขาด:", absentNames),
    ...nameSection("📋", "ลา:", leaveNames),
  ]

  if (nameSections.length > 0) {
    bodyContents.push(
      { type: "separator", margin: "md" },
      {
        type: "box",
        layout: "vertical",
        margin: "md",
        backgroundColor: GRAY_BG,
        cornerRadius: "8px",
        paddingAll: "10px",
        spacing: "sm",
        contents: nameSections,
      }
    )
  }

  const bubble: FlexComponent = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: absent_plus_late > 0 ? BRAND_RED : "#16A34A",
      paddingAll: "16px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: "📊",
              size: "xl",
              flex: 0,
            },
            {
              type: "box",
              layout: "vertical",
              flex: 1,
              paddingStart: "10px",
              contents: [
                {
                  type: "text",
                  text: `สรุปการเข้างาน · ${shiftName}`,
                  weight: "bold",
                  size: "md",
                  color: "#FFFFFF",
                },
                {
                  type: "text",
                  text: `${timeRange} · ${dateLabel}`,
                  size: "xs",
                  color: "#FFFFFFCC",
                  margin: "xs",
                },
              ],
            },
          ],
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      spacing: "none",
      contents: bodyContents,
    },
  }

  const altText =
    `[${shiftName}] เข้างาน ${checkedIn}/${total} · สาย ${late} · ขาด ${absent} · ลา ${onLeave}`

  return {
    type: "flex",
    altText,
    contents: bubble,
  }
}
