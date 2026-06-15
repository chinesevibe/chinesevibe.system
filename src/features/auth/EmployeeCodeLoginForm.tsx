"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/features/portal/LocaleProvider"

const inputClassName =
  "mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

type BranchOption = { id: string; name: string; code: string | null }

export function EmployeeCodeLoginForm() {
  const router = useRouter()
  const { tx } = useLocale()
  const [employeeCode, setEmployeeCode] = useState("")
  const [branchId, setBranchId] = useState("")
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [branchesLoading, setBranchesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    try {
      const res = await fetch("/api/auth/portal/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employee_code: employeeCode.trim(),
          branch_id: branchId,
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

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting || branchesLoading}
        className="w-full bg-brand-red text-white hover:bg-brand-red/90"
      >
        {submitting
          ? tx("auth.login.form.submitting")
          : tx("auth.login.form.submit")}
      </Button>
    </form>
  )
}
