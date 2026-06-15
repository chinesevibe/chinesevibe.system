export type LeaveBalanceSnapshot = {
  total: number
  used: number
  remaining: number
}

export function snapshotFromRow(row: {
  total_days: number | string
  used_days: number | string
}): LeaveBalanceSnapshot {
  const total = Number(row.total_days)
  const used = Number(row.used_days)
  return { total, used, remaining: total - used }
}

export function canRequestLeave(remaining: number, requestedDays: number): boolean {
  return remaining >= requestedDays
}

export function insufficientBalanceMessage(remaining: number, requestedDays: number): string {
  return `ยอดลาคงเหลือไม่เพียงพอ (เหลือ ${remaining} วัน ต้องการ ${requestedDays} วัน)`
}

const API_ERROR_FALLBACK: Record<string, string> = {
  unauthorized: "กรุณาเข้าสู่ระบบใหม่",
  invalid_fields: "ข้อมูลไม่ครบหรือไม่ถูกต้อง",
  "invalid date range": "ช่วงวันที่ลาไม่ถูกต้อง",
  no_balance: "ไม่พบยอดลาสำหรับประเภทนี้ กรุณาติดต่อ HR",
  insufficient_balance: "ยอดลาคงเหลือไม่เพียงพอ",
  "invalid file type": "รองรับเฉพาะไฟล์ JPEG, PNG หรือ PDF",
  "file too large": "ไฟล์ต้องมีขนาดไม่เกิน 5MB",
}

export function formatLeaveApiError(body: {
  error?: string
  message?: string
} | null): string {
  if (body?.message) return body.message
  if (body?.error && API_ERROR_FALLBACK[body.error]) {
    return API_ERROR_FALLBACK[body.error]
  }
  return "ส่งใบลาไม่สำเร็จ"
}
