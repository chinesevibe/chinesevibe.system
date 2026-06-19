import type { ContractType } from "@/features/employees/profile/data"
import type { SalaryPaymentMethod } from "@/features/employees/profile/payment-method"
import type { AssignableRole } from "@/lib/auth/employee-roles"
import { timeForApi } from "@/lib/datetime/time-input"
import type { PayType } from "@/lib/payroll/pay-type"
import {
  defaultPayDayForNationality,
  isValidNationality,
  isValidPayDay,
  type Nationality,
  type PayDay,
} from "@/lib/payroll/pay-day"
import { parseOffDays, serializeOffDays, type WeeklyOffDay } from "@/lib/employees/off-days"

type BankFields = {
  salary_payment_method: SalaryPaymentMethod | "" | null
  bank_name: string
  bank_account_name: string
  bank_account_number: string
  bank_branch: string
}

export function buildBankPatchFields(form: BankFields): Record<string, unknown> {
  const method = form.salary_payment_method
  if (method === "cash") {
    return {
      salary_payment_method: "cash",
      bank_name: null,
      bank_account_name: null,
      bank_account_number: null,
      bank_branch: null,
    }
  }
  if (method === "bank" && form.bank_account_number.trim()) {
    return {
      salary_payment_method: "bank",
      bank_name: form.bank_name.trim() || null,
      bank_account_name: form.bank_account_name.trim() || null,
      bank_account_number: form.bank_account_number.trim(),
      bank_branch: form.bank_branch.trim() || null,
    }
  }
  if (method === null || method === "") {
    return { salary_payment_method: null }
  }
  return {}
}

export type ProfilePatchInput = {
  name: string
  date_of_birth: string
  nationality: Nationality | ""
  pay_day: PayDay | ""
  phone: string
  email: string
  position: string
  department: string
  salary: string
  housing_allowance: string
  contract_start: string
  contract_end: string
  contract_type: ContractType
  probation_end: string
  visa_expiry: string
  work_permit_expiry: string
  status: "active" | "inactive"
  role: AssignableRole
  employee_code: string
  branch_id: string
  pay_type: PayType
  work_shift_id: string
  default_check_in_time: string
  default_check_out_time: string
  off_days: number[]
} & BankFields

function buildNationalityPayDayFields(form: {
  nationality: Nationality | ""
  pay_day: PayDay | ""
}): Record<string, unknown> {
  const nationality = isValidNationality(form.nationality) ? form.nationality : null
  const payDay =
    form.pay_day !== "" && isValidPayDay(form.pay_day)
      ? form.pay_day
      : nationality
        ? defaultPayDayForNationality(nationality)
        : null
  return { nationality, pay_day: payDay }
}

const SALARY_PATCH_KEYS = [
  "salary",
  "housing_allowance",
  "pay_type",
  "pay_day",
  "nationality",
  "salary_payment_method",
  "bank_name",
  "bank_account_name",
  "bank_account_number",
  "bank_branch",
] as const

export function buildProfilePatchBody(
  form: ProfilePatchInput,
  options?: { includeSalaryFields?: boolean }
): Record<string, unknown> {
  const includeSalary = options?.includeSalaryFields !== false
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    date_of_birth: form.date_of_birth || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    position: form.position.trim() || null,
    department: form.department.trim() || null,
    contract_start: form.contract_start || null,
    contract_end: form.contract_end || null,
    contract_type: form.contract_type,
    probation_end: form.probation_end || null,
    visa_expiry: form.visa_expiry || null,
    work_permit_expiry: form.work_permit_expiry || null,
    status: form.status,
    role: form.role,
    employee_code: form.employee_code.trim() || null,
    branch_id: form.branch_id || null,
    work_shift_id: form.work_shift_id || null,
    default_check_in_time: timeForApi(form.default_check_in_time),
    default_check_out_time: timeForApi(form.default_check_out_time),
    off_days: serializeOffDays(parseOffDays(form.off_days)),
  }

  if (includeSalary) {
    Object.assign(body, buildNationalityPayDayFields(form), {
      salary: form.salary ? Number.parseFloat(form.salary) : null,
      housing_allowance: form.housing_allowance
        ? Number.parseFloat(form.housing_allowance)
        : null,
      pay_type: form.pay_type,
      ...buildBankPatchFields(form),
    })
  } else if (isValidNationality(form.nationality)) {
    body.nationality = form.nationality
  }

  return body
}

export function stripSalaryFieldsFromPatch(
  body: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...body }
  for (const key of SALARY_PATCH_KEYS) {
    delete next[key]
  }
  return next
}

export type AddEmployeeFormState = {
  name: string
  line_user_id: string
  work_email: string
  work_phone: string
  personal_email: string
  nationality: Nationality | ""
  pay_day: PayDay | ""
  department: string
  position: string
  contract_type: ContractType
  contract_start: string
  probation_end: string
  salary: string
  housing_allowance: string
  visa_expiry: string
  work_permit_expiry: string
  status: "active" | "inactive"
  role: AssignableRole
  employee_code: string
  branch_id: string
  pay_type: PayType
  date_of_birth: string
  work_shift_id: string
  default_check_in_time: string
  default_check_out_time: string
  off_days: WeeklyOffDay[]
} & BankFields

export function buildAddEmployeeBody(form: AddEmployeeFormState): Record<string, unknown> {
  const email = form.work_email.trim() || form.personal_email.trim() || null
  return {
    name: form.name.trim(),
    line_user_id: form.line_user_id.trim() || null,
    email,
    phone: form.work_phone.trim() || null,
    date_of_birth: form.date_of_birth || null,
    ...buildNationalityPayDayFields(form),
    department: form.department.trim() || null,
    position: form.position.trim() || null,
    contract_type: form.contract_type,
    contract_start: form.contract_start || null,
    probation_end: form.probation_end || null,
    salary: form.salary ? Number.parseFloat(form.salary) : null,
    housing_allowance: form.housing_allowance
      ? Number.parseFloat(form.housing_allowance)
      : null,
    visa_expiry: form.visa_expiry || null,
    work_permit_expiry: form.work_permit_expiry || null,
    status: form.status,
    role: form.role,
    employee_code: form.employee_code.trim() || null,
    branch_id: form.branch_id || null,
    pay_type: form.pay_type,
    work_shift_id: form.work_shift_id || null,
    default_check_in_time: timeForApi(form.default_check_in_time),
    default_check_out_time: timeForApi(form.default_check_out_time),
    off_days: serializeOffDays(parseOffDays(form.off_days)),
    ...buildBankPatchFields(form),
  }
}
