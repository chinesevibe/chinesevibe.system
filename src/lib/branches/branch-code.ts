import { HEAD_OFFICE_BRANCH_CODE } from "@/lib/branches/head-office"

const BRANCH_CODE_PATTERN = /^[A-Za-z0-9-]{1,16}$/

export function normalizeBranchCode(value: string): string {
  return value.trim()
}

export function validateBranchCode(value: string): string | null {
  const code = normalizeBranchCode(value)
  if (!code) return "กรุณาระบุรหัสสาขา"
  if (!BRANCH_CODE_PATTERN.test(code)) {
    return "รหัสสาขาใช้ได้เฉพาะตัวอักษร ตัวเลข และ - (ไม่เกิน 16 ตัว)"
  }
  return null
}

export function canChangeBranchCode(
  currentCode: string | null | undefined,
  nextCode: string
): string | null {
  if (
    currentCode === HEAD_OFFICE_BRANCH_CODE &&
    normalizeBranchCode(nextCode) !== HEAD_OFFICE_BRANCH_CODE
  ) {
    return `ไม่สามารถเปลี่ยนรหัส Head Office จาก ${HEAD_OFFICE_BRANCH_CODE} ได้`
  }
  return validateBranchCode(nextCode)
}

export function mapBranchCodeConflict(message: string): string {
  if (message.includes("hr_branches") && message.includes("code")) {
    return "รหัสสาขานี้มีในระบบแล้ว — ใช้รหัสอื่น"
  }
  return message
}
