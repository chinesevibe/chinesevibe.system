"use client"

import {
  Building2,
  CreditCard,
  FileText,
  Heart,
  Mail,
  User,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useRef, useState } from "react"

import { EmployeeAvatar } from "@/components/brand/EmployeeAvatar"
import { StatusPill } from "@/components/brand/StatusPill"
import { Button, buttonVariants } from "@/components/ui/button"
import { AutoSaveIndicator } from "@/features/employees/AutoSaveIndicator"
import { buildAddEmployeeBody } from "@/features/employees/employee-form-payload"
import { WeeklyOffDaysPicker } from "@/features/employees/WeeklyOffDaysPicker"
import type { WeeklyOffDay } from "@/lib/employees/off-days"
import { useDebouncedAutoSave } from "@/features/employees/use-debounced-auto-save"
import type { BranchRow } from "@/features/branches/data"
import type {
  OrgDepartment,
  OrgPosition,
} from "@/features/organization/master-data"
import type { ContractType } from "@/features/employees/profile/data"
import { PAYMENT_METHOD_OPTIONS, type SalaryPaymentMethod } from "@/features/employees/profile/payment-method"
import { ProfileSectionCard } from "@/features/employees/profile/ProfileSectionCard"
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
  type Nationality,
  type PayDay,
} from "@/lib/payroll/pay-day"
import { cn } from "@/lib/utils"

const inputClassName =
  "mt-0.5 h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

const CONTRACT_OPTIONS: Array<{ value: ContractType; label: string }> = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
]

function FormField({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

export function AddEmployeeForm({
  departments,
  positions,
  branches,
}: {
  departments: OrgDepartment[]
  positions: OrgPosition[]
  branches: BranchRow[]
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [orgSelectionNotice, setOrgSelectionNotice] = useState<string | null>(null)
  const draftIdRef = useRef<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    line_user_id: "",
    work_email: "",
    work_phone: "",
    personal_email: "",
    address: "",
    emergency_name: "",
    emergency_relationship: "",
    emergency_phone: "",
    emergency_address: "",
    date_of_birth: "",
    gender: "",
    nationality: "" as Nationality | "",
    pay_day: "" as PayDay | "",
    id_number: "",
    department: "",
    position: "",
    contract_type: "full_time" as ContractType,
    contract_start: "",
    probation_end: "",
    salary: "",
    housing_allowance: "",
    salary_payment_method: "" as "" | Exclude<SalaryPaymentMethod, null>,
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_branch: "",
    tax_status: "",
    social_security_number: "",
    housing_fund_number: "",
    visa_expiry: "",
    work_permit_expiry: "",
    status: "active" as "active" | "inactive",
    role: "employee" as AssignableRole,
    employee_code: "",
    branch_id: "",
    pay_type: "hourly" as PayType,
    work_shift_id: "",
    default_check_in_time: "",
    default_check_out_time: "",
    off_days: [] as WeeklyOffDay[],
  })

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const roleOptions = useMemo(() => {
    const allowed = allowedRolesForDepartment(form.department, form.position)
    return ASSIGNABLE_ROLES.filter((role) => allowed.includes(role))
  }, [form.department, form.position])

  const branchDepartments = useMemo(() => {
    if (!form.branch_id) return []
    return departments.filter((d) => d.branch_id === form.branch_id)
  }, [departments, form.branch_id])

  const selectedDepartmentId = useMemo(() => {
    return branchDepartments.find((d) => d.name === form.department)?.id ?? null
  }, [branchDepartments, form.department])

  const departmentPositions = useMemo(() => {
    if (!selectedDepartmentId) return []
    return positions.filter((p) => p.department_id === selectedDepartmentId)
  }, [positions, selectedDepartmentId])

  const formSnapshot = useMemo(() => JSON.stringify(form), [form])

  const persistDraft = useCallback(async (): Promise<string | null> => {
    if (form.name.trim().length < 2) {
      return draftIdRef.current
    }

    const payload = buildAddEmployeeBody(form)
    const currentId = draftIdRef.current

    if (!currentId) {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = (await res.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null
      if (!res.ok) {
        throw new Error(body?.error ?? "บันทึกร่างไม่สำเร็จ")
      }
      if (body?.id) {
        draftIdRef.current = body.id
        setDraftId(body.id)
        return body.id
      }
      return null
    }

    const res = await fetch(`/api/employees/${currentId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? "บันทึกไม่สำเร็จ")
    }
    return currentId
  }, [form])

  const { status: autoSaveStatus, error: autoSaveError, markSaved } =
    useDebouncedAutoSave({
      snapshot: formSnapshot,
      enabled: form.name.trim().length >= 2,
      onSave: async () => {
        await persistDraft()
      },
    })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const id = await persistDraft()
      markSaved(formSnapshot)
      if (id) {
        router.push(`/admin/employees/${id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างพนักงานไม่สำเร็จ")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2"
    >
      <div className="shrink-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="relative bg-brand-red px-4 py-3 text-white md:px-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, #fff 0, transparent 45%), radial-gradient(circle at 80% 70%, #fff 0, transparent 40%)",
            }}
          />
          <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <EmployeeAvatar name={form.name.trim() || "New"} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-bold">
                    {form.name.trim() || "New Employee"}
                  </h1>
                  <StatusPill
                    label={form.status === "active" ? "Active" : "Inactive"}
                    variant={form.status === "active" ? "approved" : "neutral"}
                  />
                </div>
                <p className="text-xs text-white/85">
                  {form.employee_code.trim()
                    ? `รหัสพนักงาน · ${form.employee_code.trim()}`
                    : draftId
                      ? "บันทึกร่างแล้ว — แก้ไขต่อได้"
                      : "กรอกชื่อ 2 ตัวอักษรขึ้นไปเพื่อบันทึกอัตโนมัติ"}
                </p>
                <AutoSaveIndicator
                  status={autoSaveStatus}
                  error={autoSaveError}
                  className="text-white/80"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-white text-brand-red hover:bg-white/90"
              >
                {saving
                  ? "Saving…"
                  : draftId
                    ? "ไปที่โปรไฟล์"
                    : "Create Employee"}
              </Button>
              <Link
                href="/admin/employees"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                )}
              >
                Cancel
              </Link>
              {error ? (
                <span className="text-xs text-white/95">{error}</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <ProfileSectionCard title="Contact Information" icon={Mail}>
          <FormField label="Work Email">
            <input
              type="email"
              className={inputClassName}
              value={form.work_email}
              onChange={(e) => setField("work_email", e.target.value)}
            />
          </FormField>
          <FormField label="Work Phone">
            <input
              type="tel"
              className={inputClassName}
              value={form.work_phone}
              onChange={(e) => setField("work_phone", e.target.value)}
            />
          </FormField>
          <FormField label="Personal Email">
            <input
              type="email"
              className={inputClassName}
              value={form.personal_email}
              onChange={(e) => setField("personal_email", e.target.value)}
            />
          </FormField>
          <FormField label="Address" className="sm:col-span-2">
            <input
              className={inputClassName}
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </FormField>
        </ProfileSectionCard>

        <ProfileSectionCard title="Emergency Contact" icon={Heart}>
          <FormField label="Contact Name">
            <input
              className={inputClassName}
              value={form.emergency_name}
              onChange={(e) => setField("emergency_name", e.target.value)}
            />
          </FormField>
          <FormField label="Relationship">
            <input
              className={inputClassName}
              value={form.emergency_relationship}
              onChange={(e) => setField("emergency_relationship", e.target.value)}
            />
          </FormField>
          <FormField label="Phone Number">
            <input
              type="tel"
              className={inputClassName}
              value={form.emergency_phone}
              onChange={(e) => setField("emergency_phone", e.target.value)}
            />
          </FormField>
          <FormField label="Address">
            <input
              className={inputClassName}
              value={form.emergency_address}
              onChange={(e) => setField("emergency_address", e.target.value)}
            />
          </FormField>
        </ProfileSectionCard>

        <ProfileSectionCard title="Personal Information" icon={User}>
          <FormField label="Full Name *">
            <input
              required
              className={inputClassName}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
          </FormField>
          <FormField label="Date of Birth">
            <input
              type="date"
              className={inputClassName}
              value={form.date_of_birth}
              onChange={(e) => setField("date_of_birth", e.target.value)}
            />
          </FormField>
          <FormField label="Gender">
            <select
              className={inputClassName}
              value={form.gender}
              onChange={(e) => setField("gender", e.target.value)}
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Nationality">
            <select
              className={inputClassName}
              value={form.nationality}
              onChange={(e) => {
                const nationality = e.target.value as Nationality | ""
                setForm((prev) => ({
                  ...prev,
                  nationality,
                  pay_day: nationality ? defaultPayDayForNationality(nationality) : "",
                }))
              }}
            >
              <option value="">—</option>
              {NATIONALITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Pay Day">
            <select
              className={inputClassName}
              value={form.pay_day === "" ? "" : String(form.pay_day)}
              onChange={(e) => {
                const v = e.target.value
                setField("pay_day", v === "" ? "" : (Number(v) as PayDay))
              }}
            >
              <option value="">— auto —</option>
              {PAY_DAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ID Number">
            <input
              className={inputClassName}
              value={form.id_number}
              onChange={(e) => setField("id_number", e.target.value)}
            />
          </FormField>
          <FormField label="LINE User ID">
            <input
              className={inputClassName}
              placeholder="Uxxxxxxxx… (optional — หรือให้พนักงาน login LINE เอง)"
              value={form.line_user_id}
              onChange={(e) => setField("line_user_id", e.target.value)}
            />
          </FormField>
          <FormField label="รหัสพนักงาน">
            <input
              className={inputClassName}
              placeholder="เช่น EMP-001"
              value={form.employee_code}
              onChange={(e) => setField("employee_code", e.target.value)}
            />
          </FormField>
          <FormField label="Role">
            <select
              className={inputClassName}
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value as AssignableRole,
                }))
              }
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleDisplayLabel(role)}
                </option>
              ))}
            </select>
          </FormField>
        </ProfileSectionCard>

        <ProfileSectionCard title="Work Information" icon={Building2}>
          <FormField label="สาขา">
            <select
              className={inputClassName}
              value={form.branch_id}
              onChange={(e) => {
                const nextBranchId = e.target.value
                const branch = branches.find((b) => b.id === nextBranchId)
                setForm((prev) => {
                  const nextDepts = nextBranchId
                    ? departments.filter((d) => d.branch_id === nextBranchId)
                    : []
                  const nextDept = nextDepts.some((d) => d.name === prev.department)
                    ? prev.department
                    : ""
                  const nextDeptId = nextDepts.find((d) => d.name === nextDept)?.id
                  const nextPosition = positions.some(
                    (p) =>
                      p.name === prev.position &&
                      Boolean(nextDeptId) &&
                      p.department_id === nextDeptId
                  )
                    ? prev.position
                    : ""
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
                    department: nextDept,
                    position: nextPosition,
                    role,
                    pay_type: defaultPayTypeForBranchCode(branch?.code ?? null),
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
            <p className="mt-1 text-[10px] text-muted-foreground">
              เลือกสาขาก่อน เพื่อกรองแผนกและตำแหน่งให้ตรงกัน
            </p>
          </FormField>
          <FormField label="Department">
            <select
              className={inputClassName}
              value={form.department}
              onChange={(e) => {
                const nextDept = e.target.value
                setOrgSelectionNotice(null)
                setForm((prev) => {
                  const nextDeptId = branchDepartments.find((d) => d.name === nextDept)?.id
                  const stillValid = positions.some(
                    (p) =>
                      p.name === prev.position &&
                      nextDeptId === p.department_id
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
            </select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {form.branch_id ? "จาก Organization" : "เลือกสาขาก่อนเพื่อดูแผนก"} — เพิ่มแผนกที่{" "}
              <Link href="/admin/organization" className="text-brand-red hover:underline">
                /admin/organization
              </Link>
            </p>
          </FormField>
          <FormField label="Position">
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
            </select>
            {orgSelectionNotice ? (
              <p className="mt-1 text-[10px] text-amber-700">{orgSelectionNotice}</p>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">
                ตำแหน่งจะอิงตามแผนกในสาขาที่เลือก
              </p>
            )}
          </FormField>
          <FormField label="เวลาเข้างาน (เริ่มต้น)" className="col-span-2 sm:col-span-1">
            <input
              type="time"
              className={inputClassName}
              value={form.default_check_in_time}
              onChange={(e) => setField("default_check_in_time", e.target.value)}
              placeholder="เช่น 09:00"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              เวลาเข้างานปกติของพนักงานคนนี้
            </p>
          </FormField>
          <FormField label="เวลาเลิกงาน (เริ่มต้น)" className="col-span-2 sm:col-span-1">
            <input
              type="time"
              className={inputClassName}
              value={form.default_check_out_time}
              onChange={(e) => setField("default_check_out_time", e.target.value)}
              placeholder="เช่น 18:00"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              เวลาเลิกงานปกติของพนักงานคนนี้
            </p>
          </FormField>
          <div className="col-span-2">
            <WeeklyOffDaysPicker
              value={form.off_days}
              onChange={(off_days) => setField("off_days", off_days)}
            />
          </div>
          <FormField label="Employment Type">
            <select
              className={inputClassName}
              value={form.contract_type ?? ""}
              onChange={(e) =>
                setField("contract_type", e.target.value as ContractType)
              }
            >
              {CONTRACT_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value ?? ""}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Start Date">
            <input
              type="date"
              className={inputClassName}
              value={form.contract_start}
              onChange={(e) => setField("contract_start", e.target.value)}
            />
          </FormField>
          <FormField label="Probation End">
            <input
              type="date"
              className={inputClassName}
              value={form.probation_end}
              onChange={(e) => setField("probation_end", e.target.value)}
            />
          </FormField>
          <FormField label="ประเภทการจ่าย">
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
            <p className="mt-1 text-[10px] text-muted-foreground">
              เปลี่ยนอัตโนมัติตามสาขา — ดูเงื่อนไขที่{" "}
              <Link href="/admin/payroll/settings" className="text-brand-red hover:underline">
                ตั้งค่าเงินเดือน
              </Link>
            </p>
          </FormField>
          <FormField label={salaryFieldLabel(form.pay_type)}>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClassName}
              value={form.salary}
              onChange={(e) => setField("salary", e.target.value)}
            />
            {form.status === "active" && !form.salary ? (
              <p className="mt-1 text-[10px] text-amber-700">
                แนะนำกรอกอัตราก่อนคำนวณเงินเดือน
              </p>
            ) : null}
          </FormField>
          <FormField label="Add-on ค่าที่พัก (บาท/เดือน)">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClassName}
              value={form.housing_allowance}
              onChange={(e) => setField("housing_allowance", e.target.value)}
            />
          </FormField>
          <FormField label="Status">
            <select
              className={inputClassName}
              value={form.status}
              onChange={(e) =>
                setField("status", e.target.value as "active" | "inactive")
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
        </ProfileSectionCard>

        <ProfileSectionCard title="Bank Account" icon={CreditCard}>
          <FormField label="วิธีรับเงินเดือน" className="sm:col-span-2">
            <select
              className={inputClassName}
              value={form.salary_payment_method}
              onChange={(e) => {
                const value = e.target.value as typeof form.salary_payment_method
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
          </FormField>
          {form.salary_payment_method === "bank" ? (
            <>
              <FormField label="Bank Name">
                <input
                  className={inputClassName}
                  value={form.bank_name}
                  onChange={(e) => setField("bank_name", e.target.value)}
                />
              </FormField>
              <FormField label="Account Name">
                <input
                  className={inputClassName}
                  value={form.bank_account_name}
                  onChange={(e) => setField("bank_account_name", e.target.value)}
                />
              </FormField>
              <FormField label="Account Number">
                <input
                  className={inputClassName}
                  value={form.bank_account_number}
                  onChange={(e) => setField("bank_account_number", e.target.value)}
                />
              </FormField>
              <FormField label="Branch">
                <input
                  className={inputClassName}
                  value={form.bank_branch}
                  onChange={(e) => setField("bank_branch", e.target.value)}
                />
              </FormField>
            </>
          ) : form.salary_payment_method === "cash" ? (
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              รับเงินเดือนเป็นเงินสด
            </p>
          ) : null}
        </ProfileSectionCard>

        <ProfileSectionCard title="Tax & Social Security" icon={FileText}>
          <FormField label="Tax Status">
            <input
              className={inputClassName}
              value={form.tax_status}
              onChange={(e) => setField("tax_status", e.target.value)}
            />
          </FormField>
          <FormField label="Social Security No.">
            <input
              className={inputClassName}
              value={form.social_security_number}
              onChange={(e) => setField("social_security_number", e.target.value)}
            />
          </FormField>
          <FormField label="Housing Fund No.">
            <input
              className={inputClassName}
              value={form.housing_fund_number}
              onChange={(e) => setField("housing_fund_number", e.target.value)}
            />
          </FormField>
          <FormField label="Visa Expiry">
            <input
              type="date"
              className={inputClassName}
              value={form.visa_expiry}
              onChange={(e) => setField("visa_expiry", e.target.value)}
            />
          </FormField>
          <FormField label="Work Permit Expiry" className="sm:col-span-2">
            <input
              type="date"
              className={inputClassName}
              value={form.work_permit_expiry}
              onChange={(e) => setField("work_permit_expiry", e.target.value)}
            />
          </FormField>
        </ProfileSectionCard>
      </div>
    </form>
  )
}
