export type PdfLang = "zh" | "th" | "en"

export interface PayslipPdfLine {
  label: string
  amount: number
  note?: string | null
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
