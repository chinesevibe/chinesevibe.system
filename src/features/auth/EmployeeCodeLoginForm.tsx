"use client"

import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { ForgotPortalPasswordForm } from "@/features/auth/ForgotPortalPasswordForm"
import { useLocale } from "@/features/portal/LocaleProvider"

const inputClassName =
  "mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

type BranchOption = { id: string; name: string; code: string | null }

type PasswordRequirements = {
  requiresPassword: boolean
  needsSetup: boolean
}

export function EmployeeCodeLoginForm() {
  const router = useRouter()
  const { tx } = useLocale()
  const [employeeCode, setEmployeeCode] = useState("")
  const [branchId, setBranchId] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [requirementsByKey, setRequirementsByKey] = useState<
    Record<string, PasswordRequirements>
  >({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)

  const lookupKey = useMemo(() => {
    const code = employeeCode.trim()
    return code && branchId ? `${code}:${branchId}` : ""
  }, [employeeCode, branchId])

  const passwordRequirements = lookupKey
    ? (requirementsByKey[lookupKey] ?? null)
    : null
  const requirementsLoading = loadingKey === lookupKey

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/register/branches")
        const data = (await res.json()) as { branches?: BranchOption[] }
        if (!cancelled && res.ok) {
          setBranches(data.branches ?? [])
        }
      } finally {
        if (!cancelled) setBranchesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!lookupKey) return

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoadingKey(lookupKey)
      try {
        const [code, branch] = lookupKey.split(":")
        const res = await fetch("/api/auth/portal/login-requirements", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            employee_code: code,
            branch_id: branch,
          }),
        })
        const data = (await res.json().catch(() => null)) as
          | PasswordRequirements
          | null
        if (!cancelled && res.ok && data) {
          setRequirementsByKey((current) => ({ ...current, [lookupKey]: data }))
        }
      } finally {
        if (!cancelled) {
          setLoadingKey((current) => (current === lookupKey ? null : current))
        }
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [lookupKey])

  const needsPassword = passwordRequirements?.requiresPassword ?? false
  const needsSetup = passwordRequirements?.needsSetup ?? false

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!employeeCode.trim()) {
      setError(tx("auth.login.form.error.employeeCodeRequired"))
      return
    }
    if (!branchId) {
      setError(tx("auth.login.form.error.branchRequired"))
      return
    }
    if (needsPassword && !password) {
      setError(tx("auth.login.form.error.passwordRequired"))
      return
    }
    if (needsSetup && password !== passwordConfirm) {
      setError(tx("auth.login.form.error.passwordMismatch"))
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/portal/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employee_code: employeeCode.trim(),
          branch_id: branchId,
          ...(needsPassword
            ? {
                password,
                ...(needsSetup ? { password_confirm: passwordConfirm } : {}),
              }
            : {}),
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        redirect?: string
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error ?? tx("auth.login.form.error.loginFailed"))
      }
      if (data?.redirect) {
        router.push(data.redirect)
        router.refresh()
        return
      }
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tx("auth.login.form.error.loginFailed")
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (showForgot) {
    return (
      <ForgotPortalPasswordForm
        initialEmployeeCode={employeeCode}
        initialBranchId={branchId}
        onCancel={() => setShowForgot(false)}
      />
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="block text-sm">
        <span className="text-muted-foreground">
          {tx("auth.login.form.employeeCode")}
        </span>
        <input
          className={inputClassName}
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value)}
          placeholder={tx("auth.login.form.employeeCodePlaceholder")}
          required
          autoComplete="username"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted-foreground">{tx("auth.login.form.branch")}</span>
        <select
          className={inputClassName}
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          required
          disabled={branchesLoading}
        >
          <option value="">
            {branchesLoading
              ? tx("auth.login.form.branchLoading")
              : tx("auth.login.form.branchPlaceholder")}
          </option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
              {b.code ? ` (${b.code})` : ""}
            </option>
          ))}
        </select>
      </label>

      {needsPassword ? (
        <div key={lookupKey} className="flex flex-col gap-4">
          {needsSetup ? (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {tx("auth.login.form.passwordSetupHint")}
            </p>
          ) : null}
          <label className="block text-sm">
            <span className="text-muted-foreground">
              {needsSetup
                ? tx("auth.login.form.setPassword")
                : tx("auth.login.form.password")}
            </span>
            <div className="relative">
              <input
                className={`${inputClassName} pr-10`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tx("auth.login.form.passwordPlaceholder")}
                required
                autoComplete={needsSetup ? "new-password" : "current-password"}
                minLength={6}
                disabled={requirementsLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
          {needsSetup ? (
            <label className="block text-sm">
              <span className="text-muted-foreground">
                {tx("auth.login.form.confirmPassword")}
              </span>
              <div className="relative">
                <input
                  className={`${inputClassName} pr-10`}
                  type={showPasswordConfirm ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder={tx("auth.login.form.confirmPasswordPlaceholder")}
                  required
                  autoComplete="new-password"
                  minLength={6}
                  disabled={requirementsLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  aria-label={showPasswordConfirm ? "ซ่อนยืนยันรหัสผ่าน" : "แสดงยืนยันรหัสผ่าน"}
                >
                  {showPasswordConfirm ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </label>
          ) : null}
          {!needsSetup ? (
            <button
              type="button"
              className="text-xs text-brand-red underline-offset-2 hover:underline"
              onClick={() => setShowForgot(true)}
            >
              {tx("auth.login.forgot.link")}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting || branchesLoading || requirementsLoading}
        className="w-full bg-brand-red text-white hover:bg-brand-red/90"
      >
        {submitting
          ? tx("auth.login.form.submitting")
          : needsSetup
            ? tx("auth.login.form.submitSetup")
            : tx("auth.login.form.submit")}
      </Button>
    </form>
  )
}
