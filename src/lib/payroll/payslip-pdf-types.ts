export type PdfLang = "zh" | "th" | "en"

export interface PayslipPdfLine {
  label: string
  code?: string | null
  amount: number
  note?: string | null
}

// ---------------------------------------------------------------------------
// System line code → translated label (EN + ZH only; TH falls back to EN)
// Manual lines (MANUAL_ADD / MANUAL_DEDUCT) are intentionally omitted so
// the HR-entered label is used as-is.
// ---------------------------------------------------------------------------
const CODE_LABELS: Record<string, { en: string; zh: string }> = {
  BASIC:          { en: "Base Salary",             zh: "基本工资" },
  OT:             { en: "Overtime Pay",             zh: "加班费" },
  HOUSING:        { en: "Housing Allowance",        zh: "住房补贴" },
  UNPAID_DEDUCT:  { en: "Unpaid Leave Deduction",  zh: "无薪假扣除" },
  ADVANCE_DEDUCT: { en: "Advance Deduction",        zh: "预支扣除" },
  SSO:            { en: "Social Security",          zh: "社会保险" },
  TAX:            { en: "Income Tax",               zh: "所得税" },
}

/**
 * Translate a payslip line label.
 * - System codes with known translations → return translated label.
 * - Manual lines or unknown codes → return the original label unchanged.
 */
export function translateLabel(
  code: string | null | undefined,
  fallbackLabel: string,
  lang: PdfLang
): string {
  if (!code) return fallbackLabel
  const entry = CODE_LABELS[code]
  if (!entry) return fallbackLabel
  if (lang === "zh") return entry.zh
  return entry.en   // en + th both use English
}

export interface PayslipPdfInput {
  // Company
  companyName: string

  // Employee
  employeeName: string
  employeeCode: string
  branchName: string
  departmentName: string
  payType: "hourly" | "monthly"
  paymentDate: string
  periodLabel: string
  periodStart: string
  periodEnd: string

  // Lines (income positive, deduction negative)
  lines: PayslipPdfLine[]

  // Totals
  grossAmount: number
  ssoDeduction: number
  taxDeduction: number
  netAmount: number

  // Hours (for hourly employees)
  regularHours?: number
  otHours?: number

  // YTD
  ytdGross?: number
  ytdTax?: number
  ytdSso?: number

  // Language
  lang?: PdfLang
}

// i18n label maps
export const LABELS: Record<PdfLang, Record<string, string>> = {
  zh: {
    title: "工资单",
    company: "公司",
    employee: "姓名",
    code: "工号",
    branch: "门店",
    department: "部门",
    payType: "薪资类型",
    payTypeHourly: "小时工",
    payTypeMonthly: "月薪",
    period: "工资周期",
    paymentDate: "发放日期",
    income: "收入",
    deductions: "扣除",
    grossAmount: "应发工资",
    totalDeductions: "扣除合计",
    netAmount: "实发工资",
    ytd: "年度累计 (YTD)",
    ytdGross: "累计收入",
    ytdTax: "累计税款",
    ytdSso: "累计社保",
    note: "备注",
    signature: "签名",
    regularHours: "正常工时",
    otHours: "加班工时",
  },
  th: {
    title: "สลิปเงินเดือน",
    company: "บริษัท",
    employee: "ชื่อพนักงาน",
    code: "รหัสพนักงาน",
    branch: "สาขา",
    department: "แผนก",
    payType: "ประเภทค่าจ้าง",
    payTypeHourly: "รายชั่วโมง",
    payTypeMonthly: "รายเดือน",
    period: "งวดเงินเดือน",
    paymentDate: "วันที่จ่าย",
    income: "รายได้",
    deductions: "รายการหัก",
    grossAmount: "รวมรายได้",
    totalDeductions: "รวมหัก",
    netAmount: "เงินสุทธิ",
    ytd: "สะสมปีนี้ (YTD)",
    ytdGross: "รายได้สะสม",
    ytdTax: "ภาษีสะสม",
    ytdSso: "ประกันสังคมสะสม",
    note: "หมายเหตุ",
    signature: "ลายเซ็น",
    regularHours: "ชม.ปกติ",
    otHours: "ชม.OT",
  },
  en: {
    title: "Payslip",
    company: "Company",
    employee: "Employee",
    code: "ID",
    branch: "Branch",
    department: "Department",
    payType: "Pay Type",
    payTypeHourly: "Hourly",
    payTypeMonthly: "Monthly",
    period: "Pay Period",
    paymentDate: "Payment Date",
    income: "Earnings",
    deductions: "Deductions",
    grossAmount: "Gross Pay",
    totalDeductions: "Total Deductions",
    netAmount: "Net Pay",
    ytd: "Year-to-Date (YTD)",
    ytdGross: "YTD Earnings",
    ytdTax: "YTD Tax",
    ytdSso: "YTD SSO",
    note: "Note",
    signature: "Signature",
    regularHours: "Regular Hrs",
    otHours: "OT Hrs",
  },
}
