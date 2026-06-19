"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { requiresOfficerPortalPassword } from "@/lib/auth/department-access"

type PortalPasswordStatus = {
  requiresPassword: boolean
  hasPassword: boolean
}

type OfficerPortalPasswordPanelProps = {
  employeeId: string
  department: string | null
}

export function OfficerPortalPasswordPanel({
  employeeId,
  department,
}: OfficerPortalPasswordPanelProps) {
  const isOfficerDept = requiresOfficerPortalPassword(department)
  const [status, setStatus] = useState<PortalPasswordStatus | null>(null)
  const [fetchLoading, setFetchLoading] = useState(isOfficerDept)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOfficerDept) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `/api/employees/${employeeId}/portal-password-reset`
        )
        const data = (await res.json().catch(() => null)) as
          | PortalPasswordStatus
          | { error?: string }
          | null
        if (!cancelled && res.ok && data && "requiresPassword" in data) {
          setStatus(data)
        }
      } finally {
        if (!cancelled) setFetchLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [employeeId, isOfficerDept])

  if (!isOfficerDept) {
    return null
  }

  const loading = fetchLoading

  async function onReset() {
    if (
      !window.confirm(
        "รีเซ็ตรหัสผ่าน Officer? พนักงานจะต้องตั้งรหัสใหม่เมื่อ login ครั้งถัดไป"
      )
    ) {
      return
    }

    setResetting(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(
        `/api/employees/${employeeId}/portal-password-reset`,
        { method: "POST" }
      )
      const data = (await res.json().catch(() => null)) as {
        message?: string
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error ?? "รีเซ็ตไม่สำเร็จ")
      }
      setMessage(data?.message ?? "รีเซ็ตรหัสผ่านแล้ว")
      setStatus((current) =>
        current ? { ...current, hasPassword: false } : current
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "รีเซ็ตไม่สำเร็จ")
    } finally {
      setResetting(false)
    }
  }

  return (
    <section className="shrink-0 rounded-xl border border-border/80 bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold">รหัสผ่าน Officer Portal</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        แผนก Officer / HR Officer ต้องใช้รหัสผ่านก่อนเข้า Dashboard
      </p>
      {loading ? (
        <p className="text-xs text-muted-foreground">กำลังโหลด…</p>
      ) : (
        <p className="mb-3 text-sm">
          สถานะ:{" "}
          <span className="font-medium">
            {status?.hasPassword ? "ตั้งรหัสแล้ว" : "ยังไม่ได้ตั้งรหัส"}
          </span>
        </p>
      )}
      {message ? (
        <p className="mb-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading || resetting}
        onClick={onReset}
      >
        {resetting ? "กำลังรีเซ็ต…" : "รีเซ็ตรหัสผ่าน Officer"}
      </Button>
    </section>
  )
}
