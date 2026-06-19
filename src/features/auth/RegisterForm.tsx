"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { useRegisterLine } from "@/features/auth/RegisterLineProvider"
import { useLocale } from "@/features/portal/LocaleProvider"
import { cn } from "@/lib/utils"

const fieldClassName =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"

type BranchOption = { id: string; name: string; code: string | null }
type DepartmentOption = { id: string; name: string; branch_id: string | null }
type PositionOption = {
  id: string
  name: string
  department_id: string | null
  branch_id: string | null
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-foreground"
    >
      {children}
      {required ? <span className="text-brand-red"> *</span> : null}
    </label>
  )
}

function FormSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-border/70 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function RegisterForm() {
  const router = useRouter()
  const { tx, locale } = useLocale()
  const {
    lineReady,
    idToken,
    linked,
    linkedName,
    linkWithEmployeeCode,
  } = useRegisterLine()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [employeeCode, setEmployeeCode] = useState("")
  const [branchId, setBranchId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [positionId, setPositionId] = useState("")
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [positions, setPositions] = useState<PositionOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lineLinkPendingHint, setLineLinkPendingHint] = useState<string | null>(
    null
  )

  const lineStartUrl = useMemo(() => {
    const params = new URLSearchParams({
      lang: locale,
      next: `/register?lang=${locale}`,
    })
    return `/api/auth/line/start?${params.toString()}`
  }, [locale])

  const lineLinkHint =
    linked && linkedName
      ? tx("auth.register.lineLinked", { name: linkedName })
      : lineLinkPendingHint

  async function tryLinkLineBeforeSubmit(code: string) {
    if (!code.trim() || linked) return
    const ok = await linkWithEmployeeCode(code)
    if (ok) {
      setLineLinkPendingHint(tx("auth.register.lineLinkedPending"))
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/register/branches")
        const data = (await res.json()) as {
          branches?: BranchOption[]
          departments?: DepartmentOption[]
          positions?: PositionOption[]
          error?: string
        }
        if (cancelled) return
        if (!res.ok) {
          setOptionsError(data.error ?? tx("auth.register.error.loadOptions"))
          return
        }
        setBranches(data.branches ?? [])
        setDepartments(data.departments ?? [])
        setPositions(data.positions ?? [])
      } catch {
        if (!cancelled) {
          setOptionsError(tx("auth.register.error.loadOptions"))
        }
      } finally {
        if (!cancelled) setOptionsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tx])

  const departmentOptions = useMemo(() => departments, [departments])

  const positionOptions = useMemo(() => {
    if (!departmentId) return []
    return positions.filter((p) => p.department_id === departmentId)
  }, [departmentId, positions])

  const selectedDepartment = departmentOptions.find((d) => d.id === departmentId)
  const selectedPosition = positionOptions.find((p) => p.id === positionId)

  const departmentPlaceholder = !branchId
    ? tx("auth.register.selectBranchFirst")
    : optionsLoading
      ? tx("auth.register.loading")
      : departmentOptions.length === 0
        ? tx("auth.register.noDepartments")
        : tx("auth.register.selectDepartment")

  const positionPlaceholder = !departmentId
    ? tx("auth.register.selectDepartmentFirst")
    : positionOptions.length === 0
      ? tx("auth.register.noPositions")
      : tx("auth.register.selectPosition")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError(tx("auth.register.error.nameRequired"))
      return
    }
    if (!employeeCode.trim()) {
      setError(tx("auth.register.error.employeeCodeRequired"))
      return
    }
    if (!branchId) {
      setError(tx("auth.register.error.branchRequired"))
      return
    }
    if (!departmentId || !selectedDepartment) {
      setError(tx("auth.register.error.departmentRequired"))
      return
    }
    if (!positionId || !selectedPosition) {
      setError(tx("auth.register.error.positionRequired"))
      return
    }

    setSaving(true)
    setError(null)
    try {
      await tryLinkLineBeforeSubmit(employeeCode)

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          employee_code: employeeCode.trim(),
          branch_id: branchId,
          department_id: departmentId,
          department: selectedDepartment.name,
          position_id: positionId,
          position: selectedPosition.name,
          ...(idToken ? { line_id_token: idToken } : {}),
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        redirect?: string
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error ?? tx("auth.register.error.submitFailed"))
      }
      if (data?.redirect) {
        router.push(data.redirect)
        router.refresh()
        return
      }
      router.push("/register/pending")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tx("auth.register.error.submitFailed")
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {tx("auth.register.intro")}
      </p>

      {lineReady && !idToken ? (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {tx("auth.register.lineLoginHint")}{" "}
          <a
            href={lineStartUrl}
            className="font-medium text-brand-red underline-offset-2 hover:underline"
          >
            {tx("auth.register.lineLoginAction")}
          </a>
        </p>
      ) : null}

      {lineLinkHint ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {lineLinkHint}
        </p>
      ) : null}

      {optionsError ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {optionsError}
        </p>
      ) : null}

      <FormSection title={tx("auth.register.section.personal")}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="register-first-name" required>
              {tx("auth.register.firstName")}
            </FieldLabel>
            <input
              id="register-first-name"
              className={fieldClassName}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={tx("auth.register.firstNamePlaceholder")}
              required
              autoComplete="given-name"
            />
          </div>
          <div>
            <FieldLabel htmlFor="register-last-name" required>
              {tx("auth.register.lastName")}
            </FieldLabel>
            <input
              id="register-last-name"
              className={fieldClassName}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={tx("auth.register.lastNamePlaceholder")}
              required
              autoComplete="family-name"
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="register-employee-code" required>
            {tx("auth.register.employeeCode")}
          </FieldLabel>
          <input
            id="register-employee-code"
            className={fieldClassName}
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            onBlur={() => void tryLinkLineBeforeSubmit(employeeCode)}
            placeholder={tx("auth.register.employeeCodePlaceholder")}
            required
            autoComplete="username"
          />
        </div>
      </FormSection>

      <FormSection title={tx("auth.register.section.work")}>
        <div>
          <FieldLabel htmlFor="register-branch" required>
            {tx("auth.register.branch")}
          </FieldLabel>
          <select
            id="register-branch"
            className={fieldClassName}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            required
            disabled={optionsLoading}
          >
            <option value="">
              {optionsLoading
                ? tx("auth.register.loading")
                : tx("auth.register.selectBranch")}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {b.code ? ` (${b.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="register-department" required>
            {tx("auth.register.department")}
          </FieldLabel>
          <select
            id="register-department"
            className={fieldClassName}
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value)
              setPositionId("")
            }}
            required
            disabled={optionsLoading || !branchId}
          >
            <option value="">{departmentPlaceholder}</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="register-position" required>
            {tx("auth.register.position")}
          </FieldLabel>
          <select
            id="register-position"
            className={fieldClassName}
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            required
            disabled={optionsLoading || !departmentId}
          >
            <option value="">{positionPlaceholder}</option>
            {positionOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </FormSection>

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={saving || optionsLoading || Boolean(optionsError)}
        className={cn(
          "h-11 w-full bg-brand-red text-base font-medium text-white hover:bg-brand-red/90"
        )}
      >
        {saving ? tx("auth.register.submitting") : tx("auth.register.submit")}
      </Button>
    </form>
  )
}
