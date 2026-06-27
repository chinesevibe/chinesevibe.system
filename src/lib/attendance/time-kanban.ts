export const TIME_KANBAN_BUCKETS = [
  {
    id: "morning",
    label: "10:00 - 12:00",
    description: "เช็คคนรอบเช้าและคนที่เพิ่งเริ่มงาน",
  },
  {
    id: "afternoon",
    label: "13:00 - 18:00",
    description: "คอลัมน์หลักสำหรับรอบกลางวัน",
  },
  {
    id: "evening",
    label: "19:00 - 23:00",
    description: "รอบเย็นสำหรับร้านหรือสาขาที่เปิดดึก",
  },
  {
    id: "overnight",
    label: "00:00 - 03:00",
    description: "รองรับรอบข้ามวันโดยไม่ต้องโชว์คำว่ากะกลางคืน",
  },
] as const

export type TimeKanbanBucketId = (typeof TIME_KANBAN_BUCKETS)[number]["id"]

const ICT_OFFSET_MINUTES = 7 * 60
const TIME_RE = /(\d{2}):(\d{2})/g

function bucketIdFromMinutes(minutes: number): TimeKanbanBucketId {
  const normalized = ((minutes % 1440) + 1440) % 1440
  if (normalized < 180) return "overnight"
  if (normalized < 720) return "morning"
  if (normalized < 1080) return "afternoon"
  return "evening"
}

export function ictMinutesFromDate(date: Date): number {
  return ((date.getUTCHours() * 60 + date.getUTCMinutes() + ICT_OFFSET_MINUTES) % 1440 + 1440) % 1440
}

export function ictMinutesFromIso(iso: string): number {
  return ictMinutesFromDate(new Date(iso))
}

export function startMinutesFromWorkTimeText(workTimeText: string): number | null {
  const match = TIME_RE.exec(workTimeText)
  TIME_RE.lastIndex = 0
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function resolveTimeKanbanBucketId(input: {
  checkedInAt: string | null
  checkedOutAt: string | null
  workTimeText: string
  rosterDate: string
  today: string
  now?: Date
}): TimeKanbanBucketId {
  if (input.checkedInAt) {
    if (input.checkedOutAt) {
      // Use check-in time to keep the card in the employee's original shift bucket.
      // Using checkout time causes day-shift workers who leave at 18:xx-20:xx to
      // incorrectly land in the "evening" column (threshold ≥ 18:00).
      return bucketIdFromMinutes(ictMinutesFromIso(input.checkedInAt))
    }

    // ponytail: active records ride the current ICT clock so cards visibly move as the day advances
    if (input.rosterDate === input.today) {
      return bucketIdFromMinutes(ictMinutesFromDate(input.now ?? new Date()))
    }
    return bucketIdFromMinutes(ictMinutesFromIso(input.checkedInAt))
  }

  const scheduledStart = startMinutesFromWorkTimeText(input.workTimeText)
  return bucketIdFromMinutes(scheduledStart ?? 600)
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}
