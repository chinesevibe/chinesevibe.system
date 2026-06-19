import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { calculatePayslip } from "./calculate"
import type { PayrollConfig } from "./config"
import type { PayrollSummary } from "./types"

const baseConfig: PayrollConfig = {
  monthly_std_hours: 176,
  ot_multiplier: 1.5,
  sso_cap: 750,
  sso_rate: 0.05,
  work_entry_regular: "WORK100",
  work_entry_ot: "OT",
  work_entry_sick: "LEAVE110",
  work_entry_annual: "LEAVE120",
  odoo_monthly_struct_name: "Monthly Salary - Thailand",
  odoo_hourly_struct_name: "Hourly Wage - Thailand",
  payroll_cutoff_day: 31,
  tax_enabled: false,
  tax_rate: 0,
  leave_sick_deduct_enabled: false,
}

describe("calculatePayslip", () => {
  it("calculates hourly gross with OT", () => {
    const summary: PayrollSummary = {
      employee_id: "1",
      employee_name: "Test",
      pay_type: "hourly",
      pay_day: 4,
      salary: 100,
      housing_allowance: 0,
      worked_hours: 160,
      overtime_hours: 10,
      sick_leave_hours: 0,
      annual_leave_hours: 0,
    }
    const result = calculatePayslip(summary, baseConfig)!
    assert.equal(result.gross_amount, 17500)
    assert.equal(result.sso_deduction, 0)
    assert.equal(result.tax_deduction, 0)
    assert.equal(result.net_amount, 17500)
  })

  it("calculates monthly salary with OT", () => {
    const summary: PayrollSummary = {
      employee_id: "2",
      employee_name: "Office",
      pay_type: "monthly",
      pay_day: 4,
      salary: 22000,
      housing_allowance: 1500,
      worked_hours: 0,
      overtime_hours: 8,
      sick_leave_hours: 0,
      annual_leave_hours: 0,
    }
    const result = calculatePayslip(summary, baseConfig)!
    const otPay = (22000 / 176) * 1.5 * 8
    assert.equal(result.gross_amount, Math.round((22000 + 1500 + otPay) * 100) / 100)
    assert.equal(result.lines.find((line) => line.code === "HOUSING")?.amount, 1500)
    assert.equal(result.tax_deduction, 0)
  })

  it("ignores tax inputs while tax is disabled in runtime", () => {
    const summary: PayrollSummary = {
      employee_id: "3",
      employee_name: "Taxed",
      pay_type: "monthly",
      pay_day: 5,
      salary: 10000,
      housing_allowance: 0,
      worked_hours: 0,
      overtime_hours: 0,
      sick_leave_hours: 0,
      annual_leave_hours: 0,
    }
    const result = calculatePayslip(summary, baseConfig, { taxEnabled: true, taxRate: 0.1 })!
    assert.equal(result.tax_deduction, 0)
    assert.equal(result.net_amount, 10000)
  })
})
