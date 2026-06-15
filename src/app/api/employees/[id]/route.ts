import { NextResponse, type NextRequest } from "next/server"

import { ictToday } from "@/features/employees/data"
import type { ContractType } from "@/features/employees/profile/data"
import type { SalaryPaymentMethod } from "@/features/employees/profile/payment-method"
import { isAssignableRole, type AssignableRole } from "@/lib/auth/employee-roles"
import { canEditEmployeeRecord, canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { validateEmployeeDepartmentRole } from "@/lib/employees/validate-department-role"
import { normalizeBankFields } from "@/lib/employees/bank-fields"
import { validateWorkShiftId } from "@/features/shifts/validate"
import { permanentDeleteEmployee } from "@/lib/employees/permanent-delete"
import { defaultPayTypeForBranchCode, isValidPayType } from "@/lib/payroll/pay-type"
import type { PayType } from "@/lib/payroll/pay-type"
import {
  defaultPayDayForNationality,
  isValidNationality,
  isValidPayDay,
} from "@/lib/payroll/pay-day"
import { createClient } from "@/lib/supabase/server"

const DAY_MS = 86_400_000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIME_RE = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/

function addDays(date: string, days: number): string {
  const t = Date.parse(`${date}T00:00:00Z`) + days * DAY_MS
  return new Date(t).toISOString().slice(0, 10)
}

type PatchBody = {
  name?: string
  date_of_birth?: string | null
  phone?: string | null
  email?: string | null
  position?: string | null
  department?: string | null
  salary?: number | null
  housing_allowance?: number | null
  contract_start?: string | null
  contract_type?: ContractType
  probation_end?: string | null
  visa_expiry?: string | null
  work_permit_expiry?: string | null
  status?: "active" | "inactive"
  probationAction?: "pass" | "fail" | "extend"
  role?: string
  branch_id?: string | null
  pay_type?: PayType
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canEditEmployeeRecord(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const supabase = await createClient()
  const updates: Record<string, unknown> = {}

  if (body.probationAction) {
    const today = ictToday()
    const { data: row } = await supabase
      .from("hr_employees")
      .select("probation_end, status")
      .eq("id", id)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    if (body.probationAction === "pass") {
      updates.probation_end = addDays(today, -1)
      updates.status = "active"
    } else if (body.probationAction === "fail") {
      updates.status = "inactive"
    } else if (body.probationAction === "extend") {
      const base =
        row.probation_end && row.probation_end >= today ? row.probation_end : today
      updates.probation_end = addDays(base, 30)
      updates.status = "active"
    }
  } else {
    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim()
    }
    if (body.date_of_birth !== undefined) updates.date_of_birth = body.date_of_birth
    if (body.nationality !== undefined) {
      if (body.nationality === null || body.nationality === "") {
        updates.nationality = null
      } else if (!isValidNationality(body.nationality)) {
        return NextResponse.json({ error: "invalid nationality" }, { status: 400 })
      } else {
        updates.nationality = body.nationality
        if (body.pay_day === undefined) {
          updates.pay_day = defaultPayDayForNationality(body.nationality)
        }
      }
    }
    if (body.pay_day !== undefined) {
      if (body.pay_day === null) {
        updates.pay_day = null
      } else if (!isValidPayDay(body.pay_day)) {
        return NextResponse.json({ error: "invalid pay_day (must be 4 or 5)" }, { status: 400 })
      } else {
        updates.pay_day = body.pay_day
      }
    }
    if (body.phone !== undefined) {
      updates.phone =
        typeof body.phone === "string" && body.phone.trim()
          ? body.phone.trim()
          : null
    }
    if (body.email !== undefined) {
      if (body.email === null || body.email === "") {
        updates.email = null
      } else if (typeof body.email === "string") {
        const email = body.email.trim()
        if (email && !EMAIL_RE.test(email)) {
          return NextResponse.json({ error: "invalid email" }, { status: 400 })
        }
        updates.email = email || null
      }
    }
    if (body.position !== undefined) updates.position = body.position
    if (body.department !== undefined) updates.department = body.department
    if (body.salary !== undefined) updates.salary = body.salary
    if (body.housing_allowance !== undefined) {
      updates.housing_allowance = body.housing_allowance
    }
    if (body.contract_start !== undefined) updates.contract_start = body.contract_start
    if (body.contract_type !== undefined) {
      const allowed: ContractType[] = ["full_time", "part_time", "contract", null]
      if (!allowed.includes(body.contract_type)) {
        return NextResponse.json({ error: "invalid contract_type" }, { status: 400 })
      }
      updates.contract_type = body.contract_type
    }
    if (body.probation_end !== undefined) updates.probation_end = body.probation_end
    if (body.visa_expiry !== undefined) updates.visa_expiry = body.visa_expiry
    if (body.work_permit_expiry !== undefined) {
      updates.work_permit_expiry = body.work_permit_expiry
    }
    if (body.status === "active" || body.status === "inactive") {
      updates.status = body.status
    }
    if (body.role !== undefined) {
      if (!isAssignableRole(body.role)) {
        return NextResponse.json({ error: "invalid role" }, { status: 400 })
      }
      updates.role = body.role
    }
    if (body.employee_code !== undefined) {
      updates.employee_code =
        typeof body.employee_code === "string" && body.employee_code.trim()
          ? body.employee_code.trim()
          : null
    }
    if (body.branch_id !== undefined) {
      if (body.branch_id === null || body.branch_id === "") {
        updates.branch_id = null
      } else {
        const { data: branch } = await supabase
          .from("hr_branches")
          .select("id, code")
          .eq("id", body.branch_id)
          .maybeSingle()
        if (!branch) {
          return NextResponse.json({ error: "branch not found" }, { status: 400 })
        }
        updates.branch_id = body.branch_id
        if (body.pay_type === undefined) {
          updates.pay_type = defaultPayTypeForBranchCode(branch.code as string | null)
        }
      }
    }
    if (body.pay_type !== undefined) {
      if (!isValidPayType(body.pay_type)) {
        return NextResponse.json({ error: "invalid pay_type" }, { status: 400 })
      }
      updates.pay_type = body.pay_type
    }

    if (body.work_shift_id !== undefined) {
      try {
        updates.work_shift_id = await validateWorkShiftId(supabase, body.work_shift_id)
      } catch {
        return NextResponse.json({ error: "work shift not found" }, { status: 400 })
      }
    }

    if (body.default_check_in_time !== undefined) {
      if (body.default_check_in_time !== null && body.default_check_in_time !== "" && !TIME_RE.test(body.default_check_in_time)) {
        return NextResponse.json({ error: "invalid default_check_in_time format (HH:MM)" }, { status: 400 })
      }
      updates.default_check_in_time = body.default_check_in_time || null
    }
    if (body.default_check_out_time !== undefined) {
      if (body.default_check_out_time !== null && body.default_check_out_time !== "" && !TIME_RE.test(body.default_check_out_time)) {
        return NextResponse.json({ error: "invalid default_check_out_time format (HH:MM)" }, { status: 400 })
      }
      updates.default_check_out_time = body.default_check_out_time || null
    }

    const bank = normalizeBankFields(body)
    if (bank.error) {
      return NextResponse.json({ error: bank.error }, { status: 400 })
    }
    Object.assign(updates, bank.updates)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no changes" }, { status: 400 })
  }

  if (body.role !== undefined || body.department !== undefined || body.position !== undefined) {
    const { data: current } = await supabase
      .from("hr_employees")
      .select("department, role, position")
      .eq("id", id)
      .maybeSingle()

    if (!current) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    const nextDepartment =
      body.department !== undefined
        ? body.department
        : (current.department as string | null)
    const nextPosition =
      body.position !== undefined
        ? body.position
        : (current.position as string | null)
    const nextRole = (
      body.role !== undefined ? body.role : current.role
    ) as AssignableRole

    const roleMismatch = validateEmployeeDepartmentRole(
      nextDepartment,
      nextRole,
      caller,
      nextPosition
    )
    if (roleMismatch) {
      return NextResponse.json({ error: roleMismatch }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from("hr_employees")
    .update(updates)
    .eq("id", id)
    .select("probation_end, status")
    .maybeSingle()

  if (error) {
    const msg =
      error.code === "23505" && error.message.includes("employee_code")
        ? "รหัสพนักงานนี้มีในระบบแล้ว"
        : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  if (caller.id === id) {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีของตนเองได้" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: target, error: loadError } = await supabase
    .from("hr_employees")
    .select("id, role")
    .eq("id", id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!target) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  if (target.role === "inventory" || target.role === "dev") {
    return NextResponse.json(
      { error: "ไม่สามารถลบบัญชี Inventory/Dev ได้" },
      { status: 400 }
    )
  }

  const result = await permanentDeleteEmployee(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
