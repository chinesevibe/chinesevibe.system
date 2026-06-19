"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { AttendanceCorrectableBanner } from "@/features/attendance/AttendanceCalendar"
import { useLocale } from "@/features/portal/LocaleProvider"

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

type SubmitMessageState = {
  mode: "checkin" | "checkout" | "both"
  ok: boolean
  title: string
  message: string
}

type RetroUsage = { used: number; limit: number; remaining: number }

export function AttendanceManualClient({
  defaultDate,
  defaultTime,
  today,
  retroUsage,
  withinRetroWindow,
  retroDeadline,
  correctableDays,
}: {
  defaultDate: string
  defaultTime: string
  today: string
  retroUsage: RetroUsage
  withinRetroWindow: boolean
  retroDeadline: string | null
  correctableDays: Array<{
    workDate: string
    issue: "missing_checkin" | "missing_checkout"
    deadline: string
  }>
}) {
  const { tx } = useLocale()
  const [date, setDate] = useState(defaultDate)
  const [shiftId] = useState("")
  const [checkInTime, setCheckInTime] = useState(defaultTime)
  const [checkOutTime, setCheckOutTime] = useState("")
  const [busyMode, setBusyMode] = useState<"idle" | "checkin" | "checkout" | "both">(
    "idle"
  )
  const [manualMsg, setManualMsg] = useState<SubmitMessageState | null>(null)
  const [windowOpen, setWindowOpen] = useState(withinRetroWindow)
  const [deadlineIso, setDeadlineIso] = useState(retroDeadline)
  const [quota, setQuota] = useState(retroUsage)
  const [correctable, setCorrectable] = useState(correctableDays)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/attendance/retro-status?date=${encodeURIComponent(date)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data || data.error) return
        setWindowOpen(Boolean(data.withinRetroWindow))
        setDeadlineIso(typeof data.deadline === "string" ? data.deadline : null)
        if (data.retroUsage) setQuota(data.retroUsage as RetroUsage)
        if (Array.isArray(data.correctableDays)) {
          setCorrectable(data.correctableDays)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [date])

  const retroBlocked = !windowOpen && date < today

  const deadlineLabel = useMemo(() => {
    if (!deadlineIso) return null
    return new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    }).format(new Date(deadlineIso))
  }, [deadlineIso])

  const canCheckin = Boolean(date && checkInTime) && !retroBlocked
  const canCheckout = Boolean(date && checkOutTime) && !retroBlocked
  const canBoth = canCheckin && canCheckout

  async function submitManual(mode: "checkin" | "checkout" | "full") {
    setBusyMode(mode === "full" ? "both" : mode)
    setManualMsg(null)

    try {
      const payload = {
        date,
        shiftId: shiftId || null,
        mode:
          mode === "full"
            ? "full"
            : mode === "checkin"
              ? "checkin"
              : "checkout",
        ...(mode === "checkout"
          ? { checkOutTime: checkOutTime.trim() }
          : {
              checkInTime: checkInTime.trim(),
              ...(checkOutTime ? { checkOutTime: checkOutTime.trim() } : {}),
            }),
      }

      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = (await res.json().catch(() => null)) as {
        message?: string
        error?: string
      } | null
      if (!res.ok) {
        throw new Error(data?.error ?? tx("liff.attendance.saveFailed"))
      }

      const title =
        mode === "full"
          ? tx("liff.attendance.successBoth")
          : mode === "checkin"
            ? tx("liff.attendance.successCheckin")
            : tx("liff.attendance.successCheckout")

      setManualMsg({
        mode:
          mode === "full"
            ? "both"
            : mode === "checkin"
              ? "checkin"
              : "checkout",
        ok: true,
        title,
        message: data?.message ?? tx("liff.attendance.success"),
      })
    } catch (e) {
      setManualMsg({
        mode: mode === "full" ? "both" : mode,
        ok: false,
        title: tx("liff.attendance.errorTitle"),
        message: e instanceof Error ? e.message : tx("liff.attendance.saveFailed"),
      })
    } finally {
      setBusyMode("idle")
    }
  }

  return (
    <LiffPageShell
      title={tx("liff.attendance.pageTitle")}
      subtitle={tx("liff.attendance.pageDesc")}
    >
      <div className="flex flex-col gap-4 p-4">
        <AttendanceCorrectableBanner items={correctable} />

        {/* Quota + form card */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {tx("liff.attendance.retroQuota", {
                used: String(quota.used),
                limit: String(quota.limit),
              })}
            </p>
            {deadlineLabel ? (
              <p className="text-xs text-gray-400">
                {tx("liff.attendance.retroDeadline", { deadline: deadlineLabel })}
              </p>
            ) : null}
          </div>

          {retroBlocked ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#E80012]">
              {tx("liff.attendance.retroExpired")}
            </p>
          ) : null}

          <label className="grid gap-1 text-sm">
            <span className="font-medium text-gray-700">{tx("liff.attendance.date")}</span>
            <input
              type="date"
              className={FIELD_CLASS}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-gray-700">{tx("liff.attendance.checkinTime")}</span>
              <input
                type="time"
                className={FIELD_CLASS}
                value={checkInTime}
                onChange={(event) => setCheckInTime(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium text-gray-700">{tx("liff.attendance.checkoutTime")}</span>
              <input
                type="time"
                className={FIELD_CLASS}
                value={checkOutTime}
                onChange={(event) => setCheckOutTime(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-2 pt-1">
            <Button
              onClick={() => submitManual("checkin")}
              disabled={busyMode !== "idle" || !canCheckin}
              className="w-full bg-[#06C755] hover:bg-[#06C755]/80"
            >
              {busyMode === "checkin"
                ? tx("liff.attendance.savingCheckin")
                : tx("liff.attendance.saveCheckin")}
            </Button>
            <Button
              onClick={() => submitManual("checkout")}
              disabled={busyMode !== "idle" || !canCheckout}
              variant="outline"
            >
              {busyMode === "checkout"
                ? tx("liff.attendance.savingCheckout")
                : tx("liff.attendance.saveCheckout")}
            </Button>
            <Button
              onClick={() => submitManual("full")}
              disabled={busyMode !== "idle" || !canBoth}
              variant="secondary"
            >
              {busyMode === "both"
                ? tx("liff.attendance.savingBoth")
                : tx("liff.attendance.saveBoth")}
            </Button>
          </div>

          {manualMsg ? (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                manualMsg.ok
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-[#E80012]"
              }`}
            >
              <span className="font-semibold">{manualMsg.title}</span>
              <br />
              {manualMsg.message}
            </div>
          ) : null}
        </div>

        {/* Auto checkin info */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900">{tx("liff.attendance.autoTitle")}</p>
          <p className="mt-0.5 text-xs text-gray-400">{tx("liff.attendance.autoDesc")}</p>
        </div>
      </div>

      <LiffBottomNav />
    </LiffPageShell>
  )
}
