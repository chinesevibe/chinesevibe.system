"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/features/portal/LocaleProvider"

const inputClassName =
  "mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

type BranchOption = { id: string; name: string; code: string | null }

type ForgotPortalPasswordFormProps = {
  onCancel: () => void
  initialEmployeeCode?: string
  initialBranchId?: string
}

export function ForgotPortalPasswordForm({
  onCancel,
  initialEmployeeCode = "",
  initialBranchId = "",
}: ForgotPortalPasswordFormProps) {
  const { tx } = useLocale()
  const [employeeCode, setEmployeeCode] = useState(initialEmployeeCode)
  const [branchId, setBranchId] = useState(initialBranchId)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/auth/portal/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          employee_code: employeeCode.trim(),
          branch_id: branchId,
        }),
      })
      const data = (await res.json().catch(() => null)) as {
        message?: string
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error ?? tx("auth.login.forgot.error"))
      }
      setSuccess(data?.message ?? tx("auth.login.forgot.success"))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tx("auth.login.forgot.error")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{tx("auth.login.forgot.intro")}</p>
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
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {success}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          disabled={submitting || branchesLoading}
          className="w-full bg-brand-red text-white hover:bg-brand-red/90"
        >
          {submitting
            ? tx("auth.login.forgot.submitting")
            : tx("auth.login.forgot.submit")}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
          {tx("auth.login.forgot.back")}
        </Button>
      </div>
    </form>
  )
}
