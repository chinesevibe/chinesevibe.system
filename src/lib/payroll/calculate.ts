import type { PayrollConfig } from "@/lib/payroll/config"
import type { PayrollSummary, PayslipCalculation } from "@/lib/payroll/types"

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface CalculatePayslipOptions {
  taxEnabled?: boolean
  taxRate?: number
  leaveSickDeductEnabled?: boolean
}

export function calculatePayslip(
  summary: PayrollSummary,
  config: PayrollConfig,
  options: CalculatePayslipOptions = {}
): PayslipCalculation | null {
  const salary = summary.salary
  const housingAllowance = summary.housing_allowance > 0 ? summary.housing_allowance : 0
  if (!salary || salary <= 0) return null

  const lines: PayslipCalculation["lines"] = []

  let gross = 0
  let baseRate: number | null = null
  let monthlySalary: number | null = null

  if (summary.pay_type === "hourly") {
    baseRate = salary
    const regularPay = round2(summary.worked_hours * salary)
    const otPay = round2(summary.overtime_hours * salary * config.ot_multiplier)
    gross = round2(regularPay + otPay)

    if (regularPay > 0) {
      lines.push({ code: "BASIC", label: "ค่าแรงปกติ", amount: regularPay, sort_order: 10 })
    }
    if (otPay > 0) {
      lines.push({ code: "OT", label: "ค่าล่วงเวลา", amount: otPay, sort_order: 20 })
    }
  } else {
    monthlySalary = salary
    const hourlyRate = salary / config.monthly_std_hours
    baseRate = round2(hourlyRate)
    const otPay = round2(hourlyRate * config.ot_multiplier * summary.overtime_hours)
    gross = round2(salary + housingAllowance + otPay)

    lines.push({ code: "BASIC", label: "เงินเดือน", amount: salary, sort_order: 10 })
    if (housingAllowance > 0) {
      lines.push({
        code: "HOUSING",
        label: "Add-on ค่าที่พัก",
        amount: housingAllowance,
        sort_order: 15,
      })
    }
    if (otPay > 0) {
      lines.push({ code: "OT", label: "ค่าล่วงเวลา", amount: otPay, sort_order: 20 })
    }
  }

  const ssoDeduction = 0
  const taxDeduction = 0
  const otherDeductions = 0
  const netAmount = round2(gross - ssoDeduction - taxDeduction - otherDeductions)

  return {
    gross_amount: gross,
    sso_deduction: ssoDeduction,
    tax_deduction: taxDeduction,
    other_deductions: otherDeductions,
    net_amount: netAmount,
    lines,
    regular_hours: summary.worked_hours,
    ot_hours: summary.overtime_hours,
    sick_hours: summary.sick_leave_hours,
    annual_hours: summary.annual_leave_hours,
    base_rate: baseRate,
    monthly_salary: monthlySalary,
  }
}

export function shouldSkipEmployee(summary: PayrollSummary): string | null {
  if (summary.pay_type === "monthly") {
    if (!summary.salary || summary.salary <= 0) {
      return "Office: ยังไม่ได้ตั้งเงินเดือน"
    }
    return null
  }

  if (!summary.salary || summary.salary <= 0) {
    return "Dev: ยังไม่ได้ตั้งอัตราชั่วโมง"
  }

  const totalHours =
    summary.worked_hours +
    summary.overtime_hours +
    summary.sick_leave_hours +
    summary.annual_leave_hours
  if (totalHours === 0) {
    return "ไม่มีชม.ที่อนุมัติใน ledger"
  }

  return null
}
