"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"

import { StatusPill } from "@/components/brand/StatusPill"
import { WidgetCard } from "@/components/brand/WidgetCard"
import { Button } from "@/components/ui/button"
import { AutoSaveIndicator } from "@/features/employees/AutoSaveIndicator"
import { buildProfilePatchBody } from "@/features/employees/employee-form-payload"
import { useDebouncedAutoSave } from "@/features/employees/use-debounced-auto-save"
import type { BranchRow } from "@/features/branches/data"
import type {
  OrgDepartment,
  OrgPosition,
} from "@/features/organization/master-data"
import type { ContractType, EmployeeProfile } from "@/features/employees/profile/data"
import { EmployeeAvatarUpload } from "@/features/employees/profile/EmployeeAvatarUpload"
import { EmployeeContractUpload } from "@/features/employees/profile/EmployeeContractUpload"
import { PendingRegistrationApproval } from "@/features/employees/profile/PendingRegistrationApproval"
import { SalarySensitiveSection } from "@/features/employees/profile/SalarySensitiveSection"
import type { WorkShiftSummary } from "@/features/shifts/types"
import { formatShiftDurationHours, formatShiftTimeRange } from "@/features/shifts/format"
import {
  PAYMENT_METHOD_OPTIONS,
  type SalaryPaymentMethod,
} from "@/features/employees/profile/payment-method"
import {
  allowedRolesForDepartment,
  defaultRoleForDepartment,
} from "@/lib/auth/department-role-defaults"
import {
  ASSIGNABLE_ROLES,
  type AssignableRole,
} from "@/lib/auth/employee-roles"
import { roleDisplayLabel } from "@/lib/auth/labels"
import {
  defaultPayTypeForBranchCode,
  PAY_TYPE_OPTIONS,
  salaryFieldLabel,
  type PayType,
} from "@/lib/payroll/pay-type"
import {
  defaultPayDayForNationality,
  NATIONALITY_OPTIONS,
  PAY_DAY_OPTIONS,
  payDayLabel,
  type Nationality,
  type PayDay,
} from "@/lib/payroll/pay-day"
import { cn } from "@/lib/utils"
import { normalizeTimeToHHMM } from "@/lib/datetime/time-input"
import { parseOffDays, type WeeklyOffDay } from "@/lib/employees/off-days"
import { WeeklyOffDaysPicker } from "@/features/employees/WeeklyOffDaysPicker"

const inputBase =
  "mt-1 h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

/** Full-width within card, capped for long text fields */
const inputClassName = cn(inputBase, "w-full max-w-md")

/** Dates, amounts, short selects — fit content width */
const inputClassNameCompact = cn(inputBase, "w-full max-w-[11rem]")

const PROBATION_LABEL: Record<EmployeeProfile["probationStatus"], string> = {
  pending: "รอประเมิน",
  overdue: "ครบกำหนด รอบันทึกผล",
  passed: "ผ่านแล้ว",
  not_applicable: "ไม่มีช่วงทดลองงาน",
}

const PROBATION_VARIANT: Record<
  EmployeeProfile["probationStatus"],
  "pending" | "approved" | "neutral" | "warning"
> = {
  pending: "pending",
  overdue: "warning",
  passed: "approved",
  not_applicable: "neutral",
}

const CONTRACT_OPTIONS: Array<{ value: ContractType; label: string }> = [
  { value: null, label: "— เลือกประเภท —" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
]

type FormState = {
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
  salary_payment_method: SalaryPaymentMethod
  bank_name: string
  bank_account_name: string
  bank_account_number: string
  bank_branch: string
  work_shift_id: string
  default_check_in_time: string
  default_check_out_time: string
  off_days: WeeklyOffDay[]
}

function toFormState(profile: EmployeeProfile): FormState {
  return {
    name: profile.name,
    date_of_birth: profile.date_of_birth ?? "",
    nationality: profile.nationality ?? "",
    pay_day: profile.pay_day ?? "",
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    position: profile.position ?? "",
    department: profile.department ?? "",
    salary: profile.salary?.toString() ?? "",
    housing_allowance: profile.housing_allowance?.toString() ?? "",
    contract_start: profile.contract_start ?? "",
    contract_end: profile.contract_end ?? "",
    contract_type: profile.contract_type,
    probation_end: profile.probation_end ?? "",
    visa_expiry: profile.visa_expiry ?? "",
    work_permit_expiry: profile.work_permit_expiry ?? "",
    status: profile.status,
    role: (ASSIGNABLE_ROLES as readonly string[]).includes(profile.role)
      ? (profile.role as AssignableRole)
      : "employee",
    employee_code: profile.employee_code ?? "",
    branch_id: profile.branch_id ?? "",
    pay_type: profile.pay_type,
    salary_payment_method:
      profile.salary_payment_method ??
      (profile.bank_account_number ? "bank" : null),
    bank_name: profile.bank_name ?? "",
    bank_account_name: profile.bank_account_name ?? "",
    bank_account_number: profile.bank_account_number ?? "",
    bank_branch: profile.bank_branch ?? "",
    work_shift_id: profile.work_shift_id ?? "",
    default_check_in_time: normalizeTimeToHHMM(profile.default_check_in_time),
    default_check_out_time: normalizeTimeToHHMM(profile.default_check_out_time),
    off_days: parseOffDays(profile.off_days),
  }
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function EmployeeProfileForm({
  profile,
  branches,
  departments,
  positions,
  workShifts,
  canViewSalary,
}: {
  profile: EmployeeProfile
  branches: BranchRow[]
  departments: OrgDepartment[]
  positions: OrgPosition[]
  workShifts: WorkShiftSummary[]
  canViewSalary: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toFormState(profile))
  const [salaryRevealed, setSalaryRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [probationBusy, setProbationBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [orgSelectionNotice, setOrgSelectionNotice] = useState<string | null>(null)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const formSnapshot = useMemo(() => JSON.stringify(form), [form])

  const branchDepartments = useMemo(() => {
    if (!form.branch_id) return departments
    return departments.filter((d) => d.branch_id === form.branch_id)
  }, [departments, form.branch_id])

  const selectedDepartmentId = useMemo(() => {
    const match = branchDepartments.find((d) => d.name === form.department)
    return match?.id ?? ""
  }, [branchDepartments, form.department])

  const roleOptions = useMemo(() => {
    const allowed = allowedRolesForDepartment(form.department, form.position)
    return ASSIGNABLE_ROLES.filter((role) => allowed.includes(role))
  }, [form.department, form.position])

  const departmentPositions = useMemo(() => {
    if (!selectedDepartmentId) {
      if (!form.branch_id) return positions
      return positions.filter((p) => p.branch_id === form.branch_id)
    }
    return positions.filter((p) => p.department_id === selectedDepartmentId)
  }, [positions, selectedDepartmentId, form.branch_id])

  const persistProfile = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!form.name.trim()) {
        throw new Error("กรุณากรอกชื่อ-นามสกุล")
      }

      const res = await fetch(`/api/employees/${profile.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          buildProfilePatchBody(form, {
            includeSalaryFields: canViewSalary && salaryRevealed,
          })
        ),
      })
      const body = (await res.json().catch(() => null)) as
        | { error?: string; warning?: string }
        | null
      if (!res.ok) {
        throw new Error(body?.error ?? "บันทึกไม่สำเร็จ")
      }
      if (!opts?.silent) {
        setMessage(body?.warning ?? "บันทึกข้อมูลแล้ว")
      }
      router.refresh()
    },
    [form, profile.id, router, canViewSalary, salaryRevealed]
  )

  const { status: autoSaveStatus, error: autoSaveError, markSaved } =
    useDebouncedAutoSave({
      snapshot: formSnapshot,
      enabled: Boolean(form.name.trim()),
      onSave: () => persistProfile({ silent: true }),
    })

  async function saveProfile() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await persistProfile()
      markSaved(formSnapshot)
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  async function probationAction(action: "pass" | "fail" | "extend") {
    setProbationBusy(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/employees/${profile.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ probationAction: action }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "ดำเนินการไม่สำเร็จ")
      }
      const updated = (await res.json()) as { probation_end?: string | null; status?: string }
      if (updated.probation_end !== undefined) {
        setField("probation_end", updated.probation_end ?? "")
      }
      if (updated.status) {
        setField("status", updated.status as "active" | "inactive")
      }
      setMessage(
        action === "pass"
          ? "บันทึกผลทดลองงาน: ผ่าน"
          : action === "fail"
            ? "บันทึกผลทดลองงาน: ไม่ผ่าน"
            : "ขยายระยะทดลองงานแล้ว"
      )
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setProbationBusy(false)
    }
  }

  const isPendingRegistration =
    profile.status === "inactive" && profile.role === "employee"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <AutoSaveIndicator status={autoSaveStatus} error={autoSaveError} />
        {!form.name.trim() ? (
          <p className="text-xs text-muted-foreground">กรอกชื่อเพื่อเริ่มบันทึกอัตโนมัติ</p>
        ) : null}
      </div>
      {isPendingRegistration ? (
        <PendingRegistrationApproval employeeId={profile.id} />
      ) : null}
      {canViewSalary && !salaryRevealed ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
          ข้อมูลเงินเดือนถูกซ่อน — เลื่อนลงไปที่การ์ด「ข้อมูลเงินเดือนและการจ่าย」แล้วกด
          「แสดงข้อมูลเงินเดือน」ก่อนแก้ไข
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <WidgetCard title="ข้อมูลส่วนตัว">
          <div className="flex flex-col gap-3">
            <EmployeeAvatarUpload
              employeeId={profile.id}
              name={form.name.trim() || profile.name}
              avatarPath={profile.avatar_path}
            />
            <Field label="ชื่อ-นามสกุล">
              <input
                className={inputClassName}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
              />
            </Field>
            <Field label="วันเกิด">
              <input
                type="date"
                className={inputClassNameCompact}
                value={form.date_of_birth}
                onChange={(e) => setField("date_of_birth", e.target.value)}
              />
            </Field>
            <Field label="สัญชาติ">
              <select
                className={inputClassNameCompact}
                value={form.nationality}
                onChange={(e) => {
                  const nationality = e.target.value as Nationality | ""
                  setForm((prev) => ({
                    ...prev,
                    nationality,
                    pay_day: nationality ? defaultPayDayForNationality(nationality) : prev.pay_day,
                  }))
                }}
              >
                <option value="">— เลือก —</option>
                {NATIONALITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="เบอร์โทร">
              <input
                type="tel"
                className={inputClassName}
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </Field>
            <Field label="อีเมล">
              <input
                type="email"
                className={inputClassName}
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </Field>
            <Field label="สาขา">
              <select
                className={inputClassName}
                value={form.branch_id}
                onChange={(e) => {
                  const nextBranchId = e.target.value
                  setForm((prev) => {
                    const nextDepts = nextBranchId
                      ? departments.filter((d) => d.branch_id === nextBranchId)
                      : []
                    const deptOk = nextDepts.some((d) => d.name === prev.department)
                    const nextDept = deptOk ? prev.department : ""
                    const nextDeptId = nextDepts.find((d) => d.name === nextDept)?.id
                    const nextPosition = positions.some(
                      (p) =>
                        p.name === prev.position &&
                        Boolean(nextDeptId) &&
                        p.department_id === nextDeptId
                    )
                      ? prev.position
                      : ""
                    const branch = branches.find((b) => b.id === nextBranchId)
                    const nextRole = defaultRoleForDepartment(nextDept, nextPosition)
                    const allowed = allowedRolesForDepartment(nextDept, nextPosition)
                    const role = allowed.includes(prev.role) ? prev.role : nextRole
                    const cleared =
                      prev.department && !nextDept
                        ? "เปลี่ยนสาขาแล้ว ระบบล้างแผนกและตำแหน่งที่ไม่ตรงกับสาขาใหม่"
                        : prev.position && !nextPosition
                          ? "เปลี่ยนสาขาแล้ว ระบบล้างตำแหน่งที่ไม่ตรงกับแผนกในสาขาใหม่"
                          : null
                    setOrgSelectionNotice(cleared)
                    return {
                      ...prev,
                      branch_id: nextBranchId,
                      pay_type: branch
                        ? defaultPayTypeForBranchCode(branch.code)
                        : prev.pay_type,
                      department: nextDept,
                      position: nextPosition,
                      role,
                    }
                  })
                }}
              >
                <option value="">— เลือกสาขาก่อน —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.code ? ` (${b.code})` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                เลือกสาขาก่อน เพื่อกรองแผนกและตำแหน่งให้ตรงกัน
              </p>
            </Field>
            <Field label="แผนก">
              <select
                className={inputClassName}
                value={form.department}
                onChange={(e) => {
                  const nextDept = e.target.value
                  setOrgSelectionNotice(null)
                  setForm((prev) => {
                    const stillValid = positions.some(
                      (p) =>
                        p.name === prev.position &&
                        (!nextDept ||
                          branchDepartments.find((d) => d.name === nextDept)?.id ===
                            p.department_id)
                    )
                    const nextRole = defaultRoleForDepartment(
                      nextDept,
                      stillValid ? prev.position : ""
                    )
                    const allowed = allowedRolesForDepartment(
                      nextDept,
                      stillValid ? prev.position : ""
                    )
                    const role = allowed.includes(prev.role) ? prev.role : nextRole
                    return {
                      ...prev,
                      department: nextDept,
                      position: stillValid ? prev.position : "",
                      role,
                    }
                  })
                }}
                disabled={!form.branch_id}
              >
                <option value="">
                  {form.branch_id ? "— เลือกแผนก —" : "— เลือกสาขาก่อน —"}
                </option>
                {branchDepartments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
                {form.department &&
                !branchDepartments.some((d) => d.name === form.department) ? (
                  <option value={form.department}>{form.department} (เดิม)</option>
                ) : null}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {form.branch_id ? "จาก Organization" : "เลือกสาขาก่อนเพื่อดูแผนก"} — เพิ่มแผนกที่{" "}
                <a href="/admin/organization" className="text-brand-red hover:underline">
                  /admin/organization
                </a>
              </p>
            </Field>
            <Field label="ตำแหน่ง">
              <select
                className={inputClassName}
                value={form.position}
                onChange={(e) => {
                  const nextPosition = e.target.value
                  setOrgSelectionNotice(null)
                  setForm((prev) => {
                    const nextRole = defaultRoleForDepartment(
                      prev.department,
                      nextPosition
                    )
                    const allowed = allowedRolesForDepartment(
                      prev.department,
                      nextPosition
                    )
                    const role = allowed.includes(prev.role) ? prev.role : nextRole
                    return { ...prev, position: nextPosition, role }
                  })
                }}
                disabled={!form.branch_id || !form.department}
              >
                <option value="">
                  {!form.branch_id
                    ? "— เลือกสาขาก่อน —"
                    : form.department
                      ? "— เลือกตำแหน่ง —"
                      : "— เลือกแผนกก่อน —"}
                </option>
                {departmentPositions.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
                {form.position &&
                !departmentPositions.some((p) => p.name === form.position) ? (
                  <option value={form.position}>{form.position} (เดิม)</option>
                ) : null}
              </select>
              {orgSelectionNotice ? (
                <p className="mt-1 text-[11px] text-amber-700">{orgSelectionNotice}</p>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ตำแหน่งจะอิงตามแผนกในสาขาที่เลือก
                </p>
              )}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="รหัสพนักงาน">
                <input
                  className={inputClassName}
                  placeholder="เช่น EMP-001"
                  value={form.employee_code}
                  onChange={(e) => setField("employee_code", e.target.value)}
                />
              </Field>
              <Field label="สิทธิ์เข้าใช้งาน (Role)">
                <select
                  className={inputClassName}
                  value={form.role}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      role: e.target.value as AssignableRole,
                    }))
                  }}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleDisplayLabel(role)}
                    </option>
                  ))}
                  {form.role && !roleOptions.includes(form.role) ? (
                    <option value={form.role}>
                      {roleDisplayLabel(form.role)} (เดิม)
                    </option>
                  ) : null}
                </select>
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              จับคู่แนะนำ: Management → CEO/Admin · HR Officer / Officer+HR Officer →
              HR · Inventory+Inventory Manager → Employee (คลังสินค้า) · IT →
              Developers · Admin → Admin/HR · Accounting/Inventory → Admin ·
              สาขาอื่น → Employee/Branch Manager · Developers =
              สิทธิ์เต็มทุกข้อมูล
            </p>
            <Field label="เวลาเข้างาน (เริ่มต้น)">
              <input
                type="time"
                className={inputClassNameCompact}
                value={form.default_check_in_time}
                onChange={(e) => setField("default_check_in_time", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                เวลาเข้างานปกติของพนักงานคนนี้
              </p>
            </Field>
            <Field label="เวลาเลิกงาน (เริ่มต้น)">
              <input
                type="time"
                className={inputClassNameCompact}
                value={form.default_check_out_time}
                onChange={(e) => setField("default_check_out_time", e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                เวลาเลิกงานปกติของพนักงานคนนี้
              </p>
            </Field>
            <Field label="กะทำงาน">
              <select
                className={inputClassName}
                value={form.work_shift_id}
                onChange={(e) => setField("work_shift_id", e.target.value)}
              >
                <option value="">— ใช้ Settings fallback —</option>
                {workShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} · {formatShiftTimeRange(shift)} · {formatShiftDurationHours(shift)}h
                  </option>
                ))}
              </select>
            </Field>
            <WeeklyOffDaysPicker
              value={form.off_days}
              onChange={(off_days) => setField("off_days", off_days)}
            />
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              LINE ID:{" "}
              <span className="font-mono text-foreground">
                {profile.line_user_id ?? "—"}
              </span>
            </p>
          </div>
        </WidgetCard>

        <WidgetCard title="สัญญาจ้าง">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="วันเริ่มงาน">
              <input
                type="date"
                className={inputClassNameCompact}
                value={form.contract_start}
                onChange={(e) => setField("contract_start", e.target.value)}
              />
            </Field>
            <Field label="ประเภทสัญญา">
              <select
                className={inputClassNameCompact}
                value={form.contract_type ?? ""}
                onChange={(e) =>
                  setField(
                    "contract_type",
                    (e.target.value || null) as ContractType
                  )
                }
              >
                {CONTRACT_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value ?? ""}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="วันสิ้นสุดสัญญา">
              <input
                type="date"
                className={inputClassNameCompact}
                value={form.contract_end}
                onChange={(e) => setField("contract_end", e.target.value)}
              />
            </Field>
            <Field label="สถานะพนักงาน">
              <select
                className={inputClassNameCompact}
                value={form.status}
                onChange={(e) =>
                  setField("status", e.target.value as "active" | "inactive")
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <EmployeeContractUpload
              employeeId={profile.id}
              contractFileName={profile.contract_file_name}
              contractUploadedAt={profile.contract_uploaded_at}
            />
          </div>
        </WidgetCard>

        <SalarySensitiveSection
          canAccess={canViewSalary}
          className="lg:col-span-2"
          revealed={salaryRevealed}
          onRevealedChange={setSalaryRevealed}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ประเภทการจ่าย">
              <select
                className={inputClassName}
                value={form.pay_type}
                onChange={(e) =>
                  setField("pay_type", e.target.value as PayType)
                }
              >
                {PAY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                ดูเงื่อนไขและค่าคำนวณที่{" "}
                <Link href="/admin/payroll/settings" className="text-brand-red hover:underline">
                  ตั้งค่าเงินเดือน
                </Link>
              </p>
            </Field>
            <Field label={salaryFieldLabel(form.pay_type)}>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClassNameCompact}
                value={form.salary}
                onChange={(e) => setField("salary", e.target.value)}
              />
            </Field>
            <Field label="Add-on ค่าที่พัก (บาท/เดือน)">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClassNameCompact}
                value={form.housing_allowance}
                onChange={(e) => setField("housing_allowance", e.target.value)}
              />
            </Field>
            <Field label="วันจ่ายเงินเดือน">
              <select
                className={inputClassNameCompact}
                value={form.pay_day === "" ? "" : String(form.pay_day)}
                onChange={(e) => {
                  const v = e.target.value
                  setField("pay_day", v === "" ? "" : (Number(v) as PayDay))
                }}
              >
                <option value="">— ตามสัญชาติ —</option>
                {PAY_DAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {form.pay_day !== "" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  วันจ่าย: {payDayLabel(form.pay_day)}
                </p>
              ) : null}
            </Field>
            {form.status === "active" && !form.salary.trim() ? (
              <p className="text-xs text-amber-700 sm:col-span-2">
                พนักงาน Active ควรมี {salaryFieldLabel(form.pay_type).toLowerCase()} ก่อนคำนวณเงินเดือน
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4">
            <p className="text-sm font-medium">บัญชีธนาคาร / การรับเงินเดือน</p>
            <Field label="วิธีรับเงินเดือน">
              <select
                className={inputClassName}
                value={form.salary_payment_method ?? ""}
                onChange={(e) => {
                  const value = (e.target.value || null) as SalaryPaymentMethod
                  setForm((prev) => ({
                    ...prev,
                    salary_payment_method: value,
                    ...(value === "cash"
                      ? {
                          bank_name: "",
                          bank_account_name: "",
                          bank_account_number: "",
                          bank_branch: "",
                        }
                      : {}),
                  }))
                }}
              >
                <option value="">— เลือกวิธีรับเงิน —</option>
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            {form.salary_payment_method === "cash" ? (
              <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                พนักงานรับเงินเดือนเป็นเงินสด — ไม่ต้องกรอกข้อมูลบัญชีธนาคาร
              </p>
            ) : null}

            {form.salary_payment_method === "bank" ? (
              <>
                <Field label="ชื่อธนาคาร">
                  <input
                    className={inputClassName}
                    placeholder="เช่น กสิกรไทย, กรุงเทพ"
                    value={form.bank_name}
                    onChange={(e) => setField("bank_name", e.target.value)}
                  />
                </Field>
                <Field label="ชื่อบัญชี">
                  <input
                    className={inputClassName}
                    value={form.bank_account_name}
                    onChange={(e) => setField("bank_account_name", e.target.value)}
                  />
                </Field>
                <Field label="เลขที่บัญชี">
                  <input
                    className={inputClassName}
                    inputMode="numeric"
                    value={form.bank_account_number}
                    onChange={(e) =>
                      setField("bank_account_number", e.target.value)
                    }
                  />
                </Field>
                <Field label="สาขา">
                  <input
                    className={inputClassName}
                    value={form.bank_branch}
                    onChange={(e) => setField("bank_branch", e.target.value)}
                  />
                </Field>
              </>
            ) : null}
          </div>
        </SalarySensitiveSection>

        <WidgetCard title="ทดลองงาน">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <StatusPill
                label={PROBATION_LABEL[profile.probationStatus]}
                variant={PROBATION_VARIANT[profile.probationStatus]}
              />
            </div>
            <Field label="วันครบทดลองงาน">
              <input
                type="date"
                className={inputClassNameCompact}
                value={form.probation_end}
                onChange={(e) => setField("probation_end", e.target.value)}
              />
            </Field>
            {(profile.probationStatus === "pending" ||
              profile.probationStatus === "overdue") ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="bg-brand-red hover:bg-brand-red/90"
                  disabled={probationBusy}
                  onClick={() => probationAction("pass")}
                >
                  ผ่านทดลองงาน
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={probationBusy}
                  onClick={() => probationAction("extend")}
                >
                  ขยาย 30 วัน
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={probationBusy}
                  onClick={() => probationAction("fail")}
                >
                  ไม่ผ่าน
                </Button>
              </div>
            ) : null}
          </div>
        </WidgetCard>

        <WidgetCard title="วีซ่า / Work Permit">
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">วีซ่า</span>
                <StatusPill
                  label={profile.visaStatus.label}
                  variant={profile.visaStatus.variant}
                />
              </div>
              <input
                type="date"
                className={inputClassNameCompact}
                value={form.visa_expiry}
                onChange={(e) => setField("visa_expiry", e.target.value)}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">Work Permit</span>
                <StatusPill
                  label={profile.workPermitStatus.label}
                  variant={profile.workPermitStatus.variant}
                />
              </div>
              <input
                type="date"
                className={inputClassNameCompact}
                value={form.work_permit_expiry}
                onChange={(e) => setField("work_permit_expiry", e.target.value)}
              />
            </div>
          </div>
        </WidgetCard>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm"
        )}
      >
        <Button
          type="button"
          disabled={saving}
          className="bg-brand-red hover:bg-brand-red/90"
          onClick={saveProfile}
        >
          {saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
        </Button>
        <a
          href={`/admin/employees/${profile.id}/attendance`}
          className="text-sm font-medium text-brand-red hover:underline"
        >
          ดูประวัติการเข้างาน
        </a>
      </div>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
