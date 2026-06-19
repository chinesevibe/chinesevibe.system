"use client"

import { Eye, EyeOff } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useLocale } from "@/features/portal/LocaleProvider"

const inputClassName =
  "mt-1 h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"

type PasswordRequirements = {
  requiresPassword: boolean
  needsSetup: boolean
}

export function OfficerPasswordVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { tx } = useLocale()
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [requirements, setRequirements] = useState<PasswordRequirements | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/portal/verify-password")
        const data = (await res.json().catch(() => null)) as
          | PasswordRequirements
          | null
        if (!cancelled && res.ok && data) {
          setRequirements(data)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const needsSetup = requirements?.needsSetup ?? false
  const next = searchParams.get("next")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) {
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
      const res = await fetch("/api/auth/portal/verify-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password,
          ...(next ? { next } : {}),
          ...(needsSetup ? { password_confirm: passwordConfirm } : {}),
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

  if (loading) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {tx("auth.login.form.submitting")}
      </p>
    )
  }

  if (!requirements?.requiresPassword) {
    return null
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {needsSetup ? (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {tx("auth.login.form.passwordSetupHint")}
        </p>
      ) : (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {tx("auth.login.form.officerPasswordHint")}
        </p>
      )}
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
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
              aria-label={showPasswordConfirm ? "ซ่อนยืนยันรหัสผ่าน" : "แสดงยืนยันรหัสผ่าน"}
            >
              {showPasswordConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!needsSetup ? (
        <p className="text-center text-xs text-muted-foreground">
          {tx("auth.login.officerForgotHint")}{" "}
          <button
            type="button"
            className="text-brand-red underline-offset-2 hover:underline"
            onClick={() => {
              void fetch("/api/auth/logout", { method: "POST" }).then(() => {
                window.location.href = "/login"
              })
            }}
          >
            {tx("auth.login.officerForgotAction")}
          </button>
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={submitting}
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
