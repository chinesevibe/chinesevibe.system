import { NextRequest, NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createOdooClient } from "@/lib/odoo/client"
import { getPayrollConfig } from "@/lib/payroll/config"
import type { PayType } from "@/lib/payroll/pay-type"
import { computePaymentDate, resolvePayDay, type PayDay } from "@/lib/payroll/pay-day"
import type { PayslipBatchResult } from "@/lib/odoo/client"

function otHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  return Math.max(0, eh + em / 60 - (sh + sm / 60))
}

interface PayrollSummary {
  employee_id: string
  employee_name: string
  pay_type: PayType
  pay_day: PayDay
  salary: number | null
  worked_hours: number
  overtime_hours: number
  sick_leave_hours: number
  annual_leave_hours: number
}

interface SyncResult {
  employee_id: string
  employee_name: string
  payslip_id: number
  pay_day: PayDay
  payment_date: string
  success: boolean
  error?: string
}

type EmployeeRow = {
  id: string
  name: string
  position: string | null
  department: string | null
  salary: number | null
  pay_type: PayType
  nationality: string | null
  pay_day: number | null
  branch_id: string | null
  contract_start: string | null
  email: string | null
  employee_code: string | null
  created_at: string
}

function shouldSkipEmployee(data: PayrollSummary): string | null {
  if (data.pay_type === "monthly") {
    if (!data.salary || data.salary <= 0) {
      return "Office: ยังไม่ได้ตั้งเงินเดือน"
    }
    return null
  }

  if (!data.salary || data.salary <= 0) {
    return "Dev: ยังไม่ได้ตั้งอัตราชั่วโมง"
  }

  const totalHours =
    data.worked_hours + data.overtime_hours + data.sick_leave_hours + data.annual_leave_hours
  if (totalHours === 0) {
    return "ไม่มีชม.ที่อนุมัติใน ledger"
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const caller = await getCurrentEmployee()
    if (!caller || !["hr", "dev"].includes(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { period } = await req.json()

    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json(
        { error: "Invalid period format. Expected YYYY-MM (e.g., 2026-06)" },
        { status: 400 }
      )
    }

    const [year, month] = period.split("-")
    const periodStart = `${year}-${month}-01`
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1
    const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year)
    const periodEndExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
    const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate()
    const actualPeriodEnd = `${year}-${month}-${String(lastDayOfMonth).padStart(2, "0")}`

    const supabase = getAdminClient()
    const payrollConfig = await getPayrollConfig()

    const { data: employees, error: employeesError } = await supabase
      .from("hr_employees")
      .select(
        "id, name, position, department, salary, pay_type, nationality, pay_day, branch_id, contract_start, email, employee_code, created_at"
      )
      .eq("status", "active")

    let employeeRows: EmployeeRow[] = (employees as EmployeeRow[] | null) ?? []

    if (employeesError?.message?.includes("nationality") || employeesError?.message?.includes("pay_day")) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("hr_employees")
        .select(
          "id, name, position, department, salary, pay_type, branch_id, contract_start, email, employee_code, created_at"
        )
        .eq("status", "active")
      if (fallbackError) {
        throw new Error(`Failed to fetch employees: ${fallbackError.message}`)
      }
      employeeRows = ((fallback ?? []) as Omit<EmployeeRow, "nationality" | "pay_day">[]).map((row) => ({
        ...row,
        nationality: null,
        pay_day: 4,
      }))
    } else if (employeesError) {
      throw new Error(`Failed to fetch employees: ${employeesError.message}`)
    }

    if (employeeRows.length === 0) {
      return NextResponse.json({ error: "No active employees found" }, { status: 404 })
    }

    const { data: periods, error: periodsError } = await supabase
      .from("hr_payroll_periods")
      .select("id")
      .eq("year", parseInt(year))
      .eq("month", parseInt(month))

    if (periodsError) {
      throw new Error(`Failed to fetch payroll periods: ${periodsError.message}`)
    }

    const periodIds = (periods ?? []).map((p) => p.id as string)

    let hourLines: Array<{
      employee_id: string
      line_type: string
      hours: number
    }> = []

    if (periodIds.length > 0) {
      const { data: lines, error: linesError } = await supabase
        .from("hr_payroll_hour_lines")
        .select("employee_id, line_type, hours")
        .in("period_id", periodIds)

      if (linesError) {
        throw new Error(`Failed to fetch payroll hour lines: ${linesError.message}`)
      }
      hourLines = lines ?? []
    }

    const { data: overtime, error: overtimeError } = await supabase
      .from("hr_overtime_requests")
      .select("employee_id, work_date, start_time, end_time, status")
      .eq("status", "approved")
      .gte("work_date", periodStart)
      .lt("work_date", periodEndExclusive)

    if (overtimeError) {
      throw new Error(`Failed to fetch overtime: ${overtimeError.message}`)
    }

    const { data: leaves, error: leavesError } = await supabase
      .from("hr_leaves")
      .select("employee_id, type, start_date, end_date, leave_hours, status")
      .eq("status", "approved")
      .gte("start_date", periodStart)
      .lt("end_date", periodEndExclusive)

    if (leavesError) {
      throw new Error(`Failed to fetch leaves: ${leavesError.message}`)
    }

    const payrollData = new Map<string, PayrollSummary>()

    for (const emp of employeeRows) {
      const payDay = resolvePayDay(emp.nationality, emp.pay_day)
      payrollData.set(emp.id, {
        employee_id: emp.id,
        employee_name: emp.name,
        pay_type: (emp.pay_type as PayType) ?? "hourly",
        pay_day: payDay,
        salary: emp.salary != null ? Number(emp.salary) : null,
        worked_hours: 0,
        overtime_hours: 0,
        sick_leave_hours: 0,
        annual_leave_hours: 0,
      })
    }

    for (const line of hourLines) {
      const data = payrollData.get(line.employee_id)
      if (!data) continue
      const h = Number(line.hours)
      if (line.line_type === "regular") data.worked_hours += h
      if (line.line_type === "overtime") data.overtime_hours += h
      if (line.line_type === "sick_hourly") data.sick_leave_hours += h
    }

    for (const emp of employeeRows) {
      const data = payrollData.get(emp.id)
      if (!data || data.pay_type !== "monthly") continue

      overtime?.forEach((ot) => {
        if (ot.employee_id === emp.id && ot.start_time && ot.end_time) {
          data.overtime_hours += otHours(ot.start_time, ot.end_time)
        }
      })

      leaves?.forEach((leave) => {
        if (leave.employee_id !== emp.id) return
        if (leave.type === "sick" && leave.leave_hours) {
          data.sick_leave_hours += leave.leave_hours
        } else if (leave.type === "annual" && leave.leave_hours) {
          data.annual_leave_hours += leave.leave_hours
        }
      })
    }

    const odooClient = createOdooClient()

    const connectionTest = await odooClient.testConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        {
          error: "Failed to connect to Odoo",
          details: connectionTest.message,
        },
        { status: 503 }
      )
    }

    const results: SyncResult[] = []
    const errors: string[] = []
    const skipped: string[] = []
    const payslipsByPayDay = new Map<PayDay, number[]>()

    for (const [employeeId, data] of payrollData.entries()) {
      const skipReason = shouldSkipEmployee(data)
      if (skipReason) {
        skipped.push(`${data.employee_name}: ${skipReason}`)
        continue
      }

      try {
        const employee = employeeRows.find((e) => e.id === employeeId)
        if (!employee) continue

        const odooEmployeeId = await odooClient.syncEmployee({
          id: employee.id,
          name: employee.name,
          position: employee.position,
          department: employee.department,
          email: employee.email,
          employee_code: employee.employee_code,
          pay_day: data.pay_day,
        })

        await odooClient.syncContract(
          {
            odooEmployeeId,
            pay_type: data.pay_type,
            salary: data.salary!,
            contract_start: employee.contract_start,
            created_at: employee.created_at,
          },
          payrollConfig
        )

        const payslipResult = await odooClient.createPayslip(
          {
            employee_id: employeeId,
            pay_type: data.pay_type,
            pay_day: data.pay_day,
            period,
            period_start: periodStart,
            period_end: actualPeriodEnd,
            worked_hours: data.worked_hours,
            overtime_hours: data.overtime_hours,
            sick_leave_hours: data.sick_leave_hours,
            annual_leave_hours: data.annual_leave_hours,
          },
          payrollConfig
        )

        const paymentDate = computePaymentDate(period, data.pay_day)
        const group = payslipsByPayDay.get(data.pay_day) ?? []
        group.push(payslipResult.payslip_id)
        payslipsByPayDay.set(data.pay_day, group)

        results.push({
          employee_id: employeeId,
          employee_name: data.employee_name,
          payslip_id: payslipResult.payslip_id,
          pay_day: data.pay_day,
          payment_date: paymentDate,
          success: true,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        errors.push(`${data.employee_name}: ${errorMessage}`)
        results.push({
          employee_id: employeeId,
          employee_name: data.employee_name,
          payslip_id: -1,
          pay_day: data.pay_day,
          payment_date: computePaymentDate(period, data.pay_day),
          success: false,
          error: errorMessage,
        })
      }
    }

    const batches: PayslipBatchResult[] = []
    for (const payDay of [4, 5] as PayDay[]) {
      const ids = payslipsByPayDay.get(payDay) ?? []
      if (ids.length === 0) continue
      try {
        const batch = await odooClient.createPayslipBatch({
          period,
          payDay,
          periodStart,
          periodEnd: actualPeriodEnd,
          payslipIds: ids,
        })
        batches.push(batch)
      } catch (error) {
        errors.push(
          `Batch วันที่ ${payDay}: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }

    const summary = {
      period,
      total_employees: employeeRows.length,
      processed: results.length,
      skipped: skipped.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    }

    return NextResponse.json({
      success: true,
      summary,
      batches,
      results,
      skipped: skipped.length > 0 ? skipped : undefined,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Odoo sync error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const odooClient = createOdooClient()
    const result = await odooClient.testConnection()

    if (result.success) {
      return NextResponse.json({
        status: "connected",
        message: result.message,
        uid: result.uid,
      })
    }

    return NextResponse.json(
      {
        status: "disconnected",
        message: result.message,
      },
      { status: 503 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
