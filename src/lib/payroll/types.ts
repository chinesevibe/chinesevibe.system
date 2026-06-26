import type { PayDay } from "@/lib/payroll/pay-day"
import type { PayType } from "@/lib/payroll/pay-type"

export type PayrollRunStatus = "draft" | "locked" | "paid"
export type PayslipStatus = "draft" | "final"

export interface PayrollSummary {
  employee_id: string
  employee_name: string
  pay_type: PayType
  pay_day: PayDay
  salary: number | null
  housing_allowance: number
  worked_hours: number
  overtime_hours: number
  sick_leave_hours: number
  annual_leave_hours: number
  unpaid_leave_hours: number
  advance_amount: number
}

export interface PayslipLineInput {
  code: string
  label: string
  amount: number
  sort_order: number
}

export interface PayslipCalculation {
  gross_amount: number
  sso_deduction: number
  tax_deduction: number
  other_deductions: number
  net_amount: number
  lines: PayslipLineInput[]
  regular_hours: number
  ot_hours: number
  sick_hours: number
  annual_hours: number
  unpaid_hours: number
  base_rate: number | null
  monthly_salary: number | null
}

export interface PeriodRange {
  periodStart: string
  periodEnd: string
  periodEndExclusive: string
  label: string
}

export interface PayrollRunRow {
  id: string
  period: string
  period_start: string
  period_end: string
  cutoff_day: number | null
  status: PayrollRunStatus
  locked_at: string | null
  locked_by: string | null
  employee_count: number
  total_gross: number
  total_net: number
  created_at: string
  updated_at: string
}

export interface PayslipRow {
  id: string
  run_id: string
  employee_id: string
  employee_name?: string
  pay_type: PayType
  pay_day: PayDay
  payment_date: string
  gross_amount: number
  sso_deduction: number
  other_deductions: number
  tax_deduction: number
  net_amount: number
  status: PayslipStatus
  pdf_path: string | null
  regular_hours: number
  ot_hours: number
  sick_hours: number
  annual_hours: number
  unpaid_hours: number
  base_rate: number | null
  monthly_salary: number | null
}

export interface PayrollRunWithPayslips extends PayrollRunRow {
  payslips: PayslipRow[]
}
