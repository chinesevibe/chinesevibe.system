import { HEAD_OFFICE_BRANCH_CODE } from "@/lib/branches/head-office"

export type PayType = "monthly" | "hourly"

export const PAY_TYPE_OPTIONS: Array<{ value: PayType; label: string }> = [
  { value: "monthly", label: "เงินเดือน (Office)" },
  { value: "hourly", label: "รายชั่วโมง (หน้าร้าน)" },
]

export function defaultPayTypeForBranchCode(code: string | null | undefined): PayType {
  return code === HEAD_OFFICE_BRANCH_CODE ? "monthly" : "hourly"
}

export function salaryFieldLabel(payType: PayType): string {
  return payType === "monthly"
    ? "เงินเดือน (บาท/เดือน)"
    : "อัตราชั่วโมง (บาท/ชม.)"
}

export function payTypeDisplayLabel(payType: PayType | string | null | undefined): string {
  if (payType === "monthly") return "เงินเดือน (Office)"
  if (payType === "hourly") return "รายชั่วโมง (หน้าร้าน)"
  return "—"
}

export function isValidPayType(value: unknown): value is PayType {
  return value === "monthly" || value === "hourly"
}
