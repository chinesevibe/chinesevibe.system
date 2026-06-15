export const DOC_TYPES = [
  "employment_cert",
  "salary_cert",
  "tax_cert",
  "other",
] as const

export type DocType = (typeof DOC_TYPES)[number]

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  employment_cert: "หนังสือรับรองการทำงาน",
  salary_cert: "หนังสือรับรองเงินเดือน",
  tax_cert: "หนังสือรับรองภาษี",
  other: "เอกสารอื่นๆ",
}

export const DOC_STATUSES = [
  "pending",
  "on_hold",
  "processing",
  "ready",
  "completed",
  "rejected",
] as const

export type DocStatus = (typeof DOC_STATUSES)[number]

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  pending: "รอดำเนินการ",
  on_hold: "Hold",
  processing: "กำลังจัดทำ",
  ready: "พร้อมรับ",
  completed: "เสร็จสิ้น",
  rejected: "ปฏิเสธ",
}

export type DocDecisionAction = "hold" | "approve" | "reject"

/** Map HR action → next status from current row status */
export function resolveDocumentDecisionStatus(
  current: DocStatus,
  action: DocDecisionAction
): DocStatus {
  if (action === "hold") return "on_hold"
  if (action === "reject") return "rejected"
  switch (current) {
    case "pending":
    case "on_hold":
      return "processing"
    case "processing":
      return "ready"
    case "ready":
      return "completed"
    default:
      return current
  }
}

export const DOC_ACTIONABLE_STATUSES: DocStatus[] = [
  "pending",
  "on_hold",
  "processing",
  "ready",
]
