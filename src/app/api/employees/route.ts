import { NextResponse } from "next/server"

import type { ContractType } from "@/features/employees/profile/data"
import type { SalaryPaymentMethod } from "@/features/employees/profile/payment-method"
import {
  isAssignableRole,
  type AssignableRole,
} from "@/lib/auth/employee-roles"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { validateEmployeeDepartmentRole } from "@/lib/employees/validate-department-role"
import { validateWorkShiftId } from "@/features/shifts/validate"
import { normalizeBankFields } from "@/lib/employees/bank-fields"
import { defaultPayTypeForBranchCode, isValidPayType } from "@/lib/payroll/pay-type"
import type { PayType } from "@/lib/payroll/pay-type"
import {
  defaultPayDayForNationality,
  isValidNationality,
  isValidPayDay,
} from "@/lib/payroll/pay-day"
import { createClient } from "@/lib/supabase/server"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIME_RE = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/

type CreateBody = {
  name?: string
  line_user_id?: string | null
  date_of_birth?: string | null
  phone?: string | null
  email?: string | null
  position?: string | null
  department?: string | null
  branch_id?: string | null
  pay_type?: PayType
  salary?: number | null
  housing_allowance?: number | null
  contract_start?: string | null
  contract_type?: ContractType
  probation_end?: string | null
  visa_expiry?: string | null
  work_permit_expiry?: string | null
  status?: "active" | "inactive"
  role?: string
  employee_code?: string | null
  salary_payment_method?: SalaryPaymentMethod
  bank_name?: string | null
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_branch?: string | null
  work_shift_id?: string | null
  default_check_in_time?: string | null
  default_check_out_time?: string | null
  nationality?: string | null
  pay_day?: number | null
}

export async function POST(request: Request) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: CreateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const name = body.name?.trim()
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  if (body.email && typeof body.email === "string" && body.email.trim()) {
    if (!EMAIL_RE.test(body.email.trim())) {
      return NextResponse.json({ error: "invalid email" }, { status: 400 })
    }
  }

  const allowedContract: ContractType[] = ["full_time", "part_time", "contract", null]
  if (body.contract_type !== undefined && !allowedContract.includes(body.contract_type)) {
    return NextResponse.json({ error: "invalid contract_type" }, { status: 400 })
  }

  const role = body.role ?? "employee"
  if (!isAssignableRole(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 })
  }

  const roleMismatch = validateEmployeeDepartmentRole(
    body.department,
    role as AssignableRole,
    caller,
    body.position
  )
  if (roleMismatch) {
    return NextResponse.json({ error: roleMismatch }, { status: 400 })
  }

  const supabase = await createClient()

  let payType: PayType = "hourly"
  if (body.pay_type !== undefined) {
    if (!isValidPayType(body.pay_type)) {
      return NextResponse.json({ error: "invalid pay_type" }, { status: 400 })
    }
    payType = body.pay_type
  }

  if (body.branch_id) {
    const { data: branch } = await supabase
      .from("hr_branches")
      .select("id, code")
      .eq("id", body.branch_id)
      .maybeSingle()
    if (!branch) {
      return NextResponse.json({ error: "branch not found" }, { status: 400 })
    }
    if (body.pay_type === undefined) {
      payType = defaultPayTypeForBranchCode(branch.code as string | null)
    }
  }

  const employeeCode =
    typeof body.employee_code === "string" && body.employee_code.trim()
      ? body.employee_code.trim()
      : null

  const bank = normalizeBankFields(body)
  if (bank.error) {
    return NextResponse.json({ error: bank.error }, { status: 400 })
  }

  let workShiftId: string | null = null
  if (body.work_shift_id !== undefined) {
    try {
      workShiftId = await validateWorkShiftId(supabase, body.work_shift_id)
    } catch {
      return NextResponse.json({ error: "work shift not found" }, { status: 400 })
    }
  }

  if (body.default_check_in_time && !TIME_RE.test(body.default_check_in_time)) {
    return NextResponse.json({ error: "invalid default_check_in_time format (HH:MM)" }, { status: 400 })
  }
  if (body.default_check_out_time && !TIME_RE.test(body.default_check_out_time)) {
    return NextResponse.json({ error: "invalid default_check_out_time format (HH:MM)" }, { status: 400 })
  }

  let nationality: string | null = null
  if (body.nationality !== undefined && body.nationality !== null && body.nationality !== "") {
    if (!isValidNationality(body.nationality)) {
      return NextResponse.json({ error: "invalid nationality" }, { status: 400 })
    }
    nationality = body.nationality
  }

  let payDay: number | null = null
  if (body.pay_day !== undefined && body.pay_day !== null) {
    if (!isValidPayDay(body.pay_day)) {
      return NextResponse.json({ error: "invalid pay_day (must be 4 or 5)" }, { status: 400 })
    }
    payDay = body.pay_day
  } else if (nationality) {
    payDay = defaultPayDayForNationality(nationality)
  }

  const { data, error } = await supabase
    .from("hr_employees")
    .insert({
      name,
      employee_code: employeeCode,
      line_user_id: body.line_user_id?.trim() || null,
      date_of_birth: body.date_of_birth || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      position: body.position?.trim() || null,
      department: body.department?.trim() || null,
      branch_id: body.branch_id || null,
      pay_type: payType,
      salary: body.salary ?? null,
      housing_allowance: body.housing_allowance ?? null,
      contract_start: body.contract_start || null,
      contract_type: body.contract_type ?? null,
      probation_end: body.probation_end || null,
      visa_expiry: body.visa_expiry || null,
      work_permit_expiry: body.work_permit_expiry || null,
      status: body.status === "inactive" ? "inactive" : "active",
      role,
      work_shift_id: workShiftId,
      default_check_in_time: body.default_check_in_time || null,
      default_check_out_time: body.default_check_out_time || null,
      nationality,
      pay_day: payDay,
      ...bank.updates,
    })
    .select("id")
    .single()

  if (error) {
    const msg =
      error.code === "23505"
        ? error.message.includes("employee_code")
          ? "รหัสพนักงานนี้มีในระบบแล้ว"
          : "LINE user ID นี้มีในระบบแล้ว"
        : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
