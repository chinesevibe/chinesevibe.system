"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLocale } from "@/features/portal/LocaleProvider"

const FIELD_CLASS =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

type SubmitMessageState = {
  mode: "checkin" | "checkout" | "both"
  ok: boolean
  title: string
  message: string
}

export function AttendanceManualClient({
  defaultDate,
  defaultTime,
}: {
  defaultDate: string
  defaultTime: string
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

  const canCheckin = Boolean(date && checkInTime)
  const canCheckout = Boolean(date && checkOutTime)
  const canBoth = canCheckin && canCheckout

  async function submitManual(
    mode: "checkin" | "checkout" | "full"
  ) {
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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{tx("liff.attendance.pageTitle")}</CardTitle>
          <CardDescription>
            {tx("liff.attendance.pageDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{tx("liff.attendance.date")}</span>
            <input
              type="date"
              className={FIELD_CLASS}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{tx("liff.attendance.checkinTime")}</span>
              <input
                type="time"
                className={FIELD_CLASS}
                value={checkInTime}
                onChange={(event) => setCheckInTime(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">{tx("liff.attendance.checkoutTime")}</span>
              <input
                type="time"
                className={FIELD_CLASS}
                value={checkOutTime}
                onChange={(event) => setCheckOutTime(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-2">
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
            <p
              className={`text-sm ${manualMsg.ok ? "text-emerald-600" : "text-destructive"}`}
            >
              <span className="font-semibold">{manualMsg.title}</span>
              <br />
              {manualMsg.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tx("liff.attendance.autoTitle")}</CardTitle>
          <CardDescription>
            {tx("liff.attendance.autoDesc")}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
