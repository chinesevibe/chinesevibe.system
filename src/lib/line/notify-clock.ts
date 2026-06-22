import type { messagingApi } from "@line/bot-sdk"

import { getLineClient } from "@/lib/line/client"
import { checkinConfirmFlex } from "@/lib/line/flex/checkin"
import { checkoutSummaryFlex } from "@/lib/line/flex/checkout"
import { coerceLocale } from "@/lib/i18n/types"
import type { AttendanceMonthSummary } from "@/lib/attendance/month-summary"

function fmtICT(date: Date): string {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  })
}

export async function notifyCheckin({
  lineUserId,
  name,
  checkInAt,
  lateMinutes,
  monthSummary,
  locale,
}: {
  lineUserId: string
  name: string
  checkInAt: Date
  lateMinutes: number
  monthSummary: AttendanceMonthSummary
  locale?: string | null
}): Promise<void> {
  const flex = checkinConfirmFlex({
    name,
    timeText: fmtICT(checkInAt),
    lateMinutes,
    monthSummary,
    locale: coerceLocale(locale),
  })
  await pushWithRetry(lineUserId, [flex])
}

export async function notifyCheckout({
  lineUserId,
  name,
  checkInAt,
  checkOutAt,
  workMinutes,
  showWorkDuration,
  monthSummary,
  locale,
}: {
  lineUserId: string
  name: string
  checkInAt: Date
  checkOutAt: Date
  workMinutes: number
  showWorkDuration?: boolean
  monthSummary: AttendanceMonthSummary
  locale?: string | null
}): Promise<void> {
  const flex = checkoutSummaryFlex({
    name,
    inText: fmtICT(checkInAt),
    outText: fmtICT(checkOutAt),
    workMinutes,
    showWorkDuration,
    monthSummary,
    locale: coerceLocale(locale),
  })
  await pushWithRetry(lineUserId, [flex])
}

async function pushWithRetry(to: string, messages: messagingApi.Message[]) {
  try {
    await getLineClient().pushMessage({ to, messages })
  } catch (error) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    await getLineClient().pushMessage({ to, messages }).catch((retryError) => {
      throw retryError instanceof Error ? retryError : error
    })
  }
}
