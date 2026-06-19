import { ictToday } from "@/features/employees/data"
import type { SalaryPaymentMethod } from "@/features/employees/profile/payment-method"
import type { PayType } from "@/lib/payroll/pay-type"
import {
  resolvePayDay,
  type Nationality,
  type PayDay,
} from "@/lib/payroll/pay-day"
import {
  expiryStatusLabel,
  type ExpiryStatusLabel,
} from "@/features/employees/profile/visa-status"
import type { WorkShiftSummary } from "@/features/shifts/types"
import { employeeAvatarPublicUrl } from "@/lib/employees/avatar"
import { normalizeTimeToHHMM } from "@/lib/datetime/time-input"
import { parseOffDays } from "@/lib/employees/off-days"
import { getAdminClient } from "@/lib/auth/admin-client"
import { createClient } from "@/lib/supabase/server"

export type { SalaryPaymentMethod } from "@/features/employees/profile/payment-method"

export type ContractType = "full_time" | "part_time" | "contract" | null

export type EmployeeProfile = {
  id: string
  employee_code: string | null
  line_user_id: string | null
  name: string
  date_of_birth: string | null
  nationality: Nationality | null
  pay_day: PayDay | null
  phone: string | null
  email: string | null
  position: string | null
  department: string | null
  branch_id: string | null
  work_shift_id: string | null
  workShift: WorkShiftSummary | null
  default_check_in_time: string | null
  default_check_out_time: string | null
  off_days: number[]
  pay_type: PayType
  salary: number | null
  housing_allowance: number | null
  contract_start: string | null
  contract_type: ContractType
  probation_end: string | null
  probation_outcome: string | null
  probation_outcome_note: string | null
  probation_extended_until: string | null
  contract_end: string | null
  visa_expiry: string | null
  work_permit_expiry: string | null
  salary_payment_method: SalaryPaymentMethod
  bank_name: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  bank_branch: string | null
  leave_blacklisted: boolean
  leave_blacklist_reason: string | null
  leave_blacklisted_at: string | null
  avatar_path: string | null
  avatarUrl: string | null
  contract_file_path: string | null
  contract_file_name: string | null
  contract_uploaded_at: string | null
  role: string
  status: "active" | "inactive"
  probationStatus: "pending" | "overdue" | "passed" | "not_applicable"
  visaStatus: ExpiryStatusLabel
  workPermitStatus: ExpiryStatusLabel
}

export function deriveProbationStatus(
  status: "active" | "inactive",
  probationEnd: string | null,
  today: string,
  probationOutcome: string | null = null
): EmployeeProfile["probationStatus"] {
  if (probationOutcome === "passed") return "passed"
  if (status !== "active" || !probationEnd) return "not_applicable"
  return probationEnd >= today ? "pending" : "overdue"
}

const PROFILE_BASE_SELECT =
  "id, employee_code, line_user_id, name, date_of_birth, nationality, pay_day, phone, email, position, department, branch_id, work_shift_id, default_check_in_time, default_check_out_time, off_days, salary, contract_start, contract_type, contract_end, contract_file_path, contract_file_name, contract_uploaded_at, probation_end, probation_outcome, probation_outcome_note, probation_extended_until, visa_expiry, work_permit_expiry, salary_payment_method, bank_name, bank_account_name, bank_account_number, bank_branch, leave_blacklisted, leave_blacklist_reason, leave_blacklisted_at, avatar_path, role, status"

const PROFILE_SHIFT_EMBED =
  ", hr_work_shifts(id, code, name, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes, standard_hours, is_active)"

type ProfileRow = Record<string, unknown> & {
  hr_work_shifts?: WorkShiftSummary | WorkShiftSummary[] | null
}

async function loadProfileRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
): Promise<ProfileRow | null> {
  const attempts = [
    `${PROFILE_BASE_SELECT}, housing_allowance${PROFILE_SHIFT_EMBED}`,
    `${PROFILE_BASE_SELECT}${PROFILE_SHIFT_EMBED}`,
    `${PROFILE_BASE_SELECT.replace(", off_days", "")}, housing_allowance${PROFILE_SHIFT_EMBED}`,
    `${PROFILE_BASE_SELECT.replace(", off_days", "")}${PROFILE_SHIFT_EMBED}`,
    `${PROFILE_BASE_SELECT.replace(", off_days", "")}, housing_allowance`,
    PROFILE_BASE_SELECT.replace(", off_days", ""),
  ]

  let lastError: { message?: string } | null = null
  for (const select of attempts) {
    const { data, error } = await supabase
      .from("hr_employees")
      .select(select)
      .eq("id", id)
      .maybeSingle()

    if (!error) return (data as ProfileRow | null) ?? null
    lastError = error
    if (!error.message?.includes("does not exist")) break
  }

  if (lastError) throw lastError
  return null
}

export async function getEmployeeProfile(
  id: string
): Promise<EmployeeProfile | null> {
  const supabase = await createClient()
  const today = ictToday()

  const data = await loadProfileRow(supabase, id)
  if (!data) return null

  let pay_type: PayType = "hourly"
  let nationality: Nationality | null = null
  let pay_day: PayDay | null = null

  const { data: payRow, error: payTypeError } = await supabase
    .from("hr_employees")
    .select("pay_type, nationality, pay_day")
    .eq("id", id)
    .maybeSingle()

  if (!payTypeError && payRow) {
    if (payRow.pay_type === "monthly" || payRow.pay_type === "hourly") {
      pay_type = payRow.pay_type
    }
    nationality = (payRow.nationality as Nationality | null) ?? null
    pay_day =
      payRow.pay_day === 4 || payRow.pay_day === 5
        ? payRow.pay_day
        : resolvePayDay(nationality, null)
  } else if (
    payTypeError?.message?.includes("nationality") ||
    payTypeError?.message?.includes("pay_day")
  ) {
    const { data: legacyPayRow } = await supabase
      .from("hr_employees")
      .select("pay_type")
      .eq("id", id)
      .maybeSingle()
    if (legacyPayRow?.pay_type === "monthly" || legacyPayRow?.pay_type === "hourly") {
      pay_type = legacyPayRow.pay_type
    }
    pay_day = 4
  }

  const status = data.status as "active" | "inactive"

  const avatar_path = (data.avatar_path as string | null) ?? null
  const joinedShift = data.hr_work_shifts as WorkShiftSummary | null | WorkShiftSummary[]
  const workShift = Array.isArray(joinedShift) ? joinedShift[0] ?? null : joinedShift ?? null
  const housing_allowance =
    data.housing_allowance != null ? Number(data.housing_allowance) : null

  return {
    id: data.id as string,
    employee_code: (data.employee_code as string | null) ?? null,
    line_user_id: (data.line_user_id as string | null) ?? null,
    name: data.name as string,
    date_of_birth: (data.date_of_birth as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    position: (data.position as string | null) ?? null,
    department: (data.department as string | null) ?? null,
    branch_id: (data.branch_id as string | null) ?? null,
    work_shift_id: (data.work_shift_id as string | null) ?? null,
    workShift,
    default_check_in_time:
      normalizeTimeToHHMM(data.default_check_in_time as string | null) || null,
    default_check_out_time:
      normalizeTimeToHHMM(data.default_check_out_time as string | null) || null,
    off_days: parseOffDays(data.off_days),
    salary: data.salary != null ? Number(data.salary) : null,
    housing_allowance,
    contract_start: (data.contract_start as string | null) ?? null,
    probation_end: (data.probation_end as string | null) ?? null,
    visa_expiry: (data.visa_expiry as string | null) ?? null,
    work_permit_expiry: (data.work_permit_expiry as string | null) ?? null,
    avatar_path,
    role: data.role as string,
    nationality,
    pay_day,
    pay_type,
    avatarUrl: employeeAvatarPublicUrl(avatar_path),
    contract_type: (data.contract_type as ContractType) ?? null,
    salary_payment_method: (data.salary_payment_method as SalaryPaymentMethod) ?? null,
    bank_name: data.bank_name as string | null,
    bank_account_name: data.bank_account_name as string | null,
    bank_account_number: data.bank_account_number as string | null,
    bank_branch: data.bank_branch as string | null,
    leave_blacklisted: Boolean(data.leave_blacklisted),
    leave_blacklist_reason: data.leave_blacklist_reason as string | null,
    leave_blacklisted_at: data.leave_blacklisted_at as string | null,
    probation_outcome: data.probation_outcome as string | null,
    probation_outcome_note: data.probation_outcome_note as string | null,
    probation_extended_until: data.probation_extended_until as string | null,
    contract_end: data.contract_end as string | null,
    contract_file_path: (data.contract_file_path as string | null) ?? null,
    contract_file_name: (data.contract_file_name as string | null) ?? null,
    contract_uploaded_at: (data.contract_uploaded_at as string | null) ?? null,
    status,
    probationStatus: deriveProbationStatus(
      status,
      data.probation_end as string | null,
      today,
      data.probation_outcome as string | null
    ),
    visaStatus: expiryStatusLabel(data.visa_expiry as string | null, today),
    workPermitStatus: expiryStatusLabel(data.work_permit_expiry as string | null, today),
  }
}

export async function getComplianceNotes(employeeId: string) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_compliance_notes")
    .select(
      "id, category, note, created_at, attachment_file_path, attachment_file_name, attachment_uploaded_at"
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) throw error

  const rows = data ?? []
  return Promise.all(
    rows.map(async (row) => {
      const attachmentPath = (row.attachment_file_path as string | null) ?? null
      let attachmentUrl: string | null = null

      if (attachmentPath) {
        const { data: signed } = await admin.storage
          .from("hr-compliance-notes")
          .createSignedUrl(attachmentPath, 60 * 60)
        attachmentUrl = signed?.signedUrl ?? null
      }

      return {
        ...row,
        attachment_file_path: attachmentPath,
        attachment_file_name: (row.attachment_file_name as string | null) ?? null,
        attachment_uploaded_at: (row.attachment_uploaded_at as string | null) ?? null,
        attachment_url: attachmentUrl,
      }
    })
  )
}
