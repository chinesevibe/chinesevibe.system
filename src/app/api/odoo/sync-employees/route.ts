import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createOdooClient } from "@/lib/odoo/client"
import { getPayrollConfig } from "@/lib/payroll/config"
import type { PayType } from "@/lib/payroll/pay-type"
import { resolvePayDay, type PayDay } from "@/lib/payroll/pay-day"

type EmployeeRow = {
  id: string
  name: string
  position: string | null
  department: string | null
  email: string | null
  employee_code: string | null
  salary: number | null
  pay_type: PayType
  nationality: string | null
  pay_day: number | null
  contract_start: string | null
  created_at: string
}

export async function POST() {
  try {
    const caller = await getCurrentEmployee()
    if (!caller || !["hr", "dev"].includes(caller.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = getAdminClient()
    const payrollConfig = await getPayrollConfig()
    const odooClient = createOdooClient()

    const connectionTest = await odooClient.testConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: "Failed to connect to Odoo", details: connectionTest.message },
        { status: 503 }
      )
    }

    const { data: employeesInitial, error } = await supabase
      .from("hr_employees")
      .select(
        "id, name, position, department, email, employee_code, salary, pay_type, nationality, pay_day, contract_start, created_at"
      )
      .eq("status", "active")
      .order("name")

    let employees = employeesInitial

    if (error?.message?.includes("nationality") || error?.message?.includes("pay_day")) {
      const fallback = await supabase
        .from("hr_employees")
        .select(
          "id, name, position, department, email, employee_code, salary, pay_type, contract_start, created_at"
        )
        .eq("status", "active")
        .order("name")
      if (fallback.error) throw fallback.error
      employees = (fallback.data ?? []).map((row) => ({
        ...row,
        nationality: null,
        pay_day: 4,
      }))
    } else if (error) {
      throw error
    }

    const results: Array<{
      employee_id: string
      employee_name: string
      pay_day: PayDay
      success: boolean
      skipped?: string
      error?: string
    }> = []

    for (const emp of (employees ?? []) as EmployeeRow[]) {
      const payDay = resolvePayDay(emp.nationality, emp.pay_day)
      try {
        const odooEmployeeId = await odooClient.syncEmployee({
          id: emp.id,
          name: emp.name,
          position: emp.position,
          department: emp.department,
          email: emp.email,
          employee_code: emp.employee_code,
          pay_day: payDay,
        })

        if (!emp.salary || Number(emp.salary) <= 0) {
          results.push({
            employee_id: emp.id,
            employee_name: emp.name,
            pay_day: payDay,
            success: true,
            skipped: "no salary — employee profile only",
          })
          continue
        }

        await odooClient.syncContract(
          {
            odooEmployeeId,
            pay_type: (emp.pay_type as PayType) ?? "hourly",
            salary: Number(emp.salary),
            contract_start: emp.contract_start,
            created_at: emp.created_at,
          },
          payrollConfig
        )

        results.push({
          employee_id: emp.id,
          employee_name: emp.name,
          pay_day: payDay,
          success: true,
        })
      } catch (err) {
        results.push({
          employee_id: emp.id,
          employee_name: emp.name,
          pay_day: payDay,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({
      success: failed === 0,
      summary: {
        total: results.length,
        successful,
        failed,
      },
      results,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
