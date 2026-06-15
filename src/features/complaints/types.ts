export const COMPLAINT_STATUSES = ["open", "replied", "closed"] as const

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number]

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  open: "เปิด",
  replied: "ตอบแล้ว",
  closed: "ปิดเรื่อง",
}
