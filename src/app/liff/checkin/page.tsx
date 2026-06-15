"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { MessageKey } from "@/lib/i18n/translate"

type CheckinState =
  | { phase: "idle" }
  | { phase: "locating" }
  | { phase: "submitting" }
  | { phase: "done"; title: string; detail: string; ok: boolean }

function describeError(
  status: number,
  data: { error?: string; message?: string; distanceM?: number; limitM?: number },
  tx: (key: MessageKey, vars?: Record<string, string | number>) => string
): string {
  if (status === 410) return tx("liff.checkin.expired")
  if (status === 401) return tx("liff.checkin.invalidQr")
  if (status === 403 && data.error === "outside_geofence") {
    const dist = Math.round(data.distanceM ?? 0)
    const limit = data.limitM ?? 200
    return tx("liff.checkin.outside", { distance: dist, limit })
  }
  if (status === 404) return tx("liff.checkin.notFound")
  return data.message ?? data.error ?? tx("liff.checkin.error")
}

function CheckinForm() {
  const { tx } = useLocale()
  const token = useSearchParams().get("token")
  const [state, setState] = useState<CheckinState>({ phase: "idle" })

  async function submit(latitude: number, longitude: number) {
    setState({ phase: "submitting" })
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, latitude, longitude }),
    })
    const data = await response.json().catch(() => ({}))

    if (response.ok && data.status === "success") {
      setState({
        phase: "done",
        ok: true,
        title: tx("liff.checkin.successTitle"),
        detail:
          data.lateMinutes > 0
            ? tx("liff.checkin.successLate", {
                name: data.employeeName,
                time: data.timeText,
                minutes: data.lateMinutes,
              })
            : tx("liff.checkin.successOnTime", {
                name: data.employeeName,
                time: data.timeText,
              }),
      })
    } else if (response.ok && data.status === "already_checked_in") {
      setState({
        phase: "done",
        ok: true,
        title: tx("liff.checkin.alreadyTitle"),
        detail: tx("liff.checkin.alreadyDetail", { time: data.timeText }),
      })
    } else {
      setState({
        phase: "done",
        ok: false,
        title: tx("liff.checkin.failTitle"),
        detail: describeError(response.status, data, tx),
      })
    }
  }

  function start() {
    if (!navigator.geolocation) {
      setState({
        phase: "done",
        ok: false,
        title: tx("liff.checkin.failTitle"),
        detail: tx("liff.checkin.unsupportedGeo"),
      })
      return
    }
    setState({ phase: "locating" })
    navigator.geolocation.getCurrentPosition(
      (pos) => submit(pos.coords.latitude, pos.coords.longitude),
      () =>
        setState({
          phase: "done",
          ok: false,
          title: tx("liff.checkin.permissionTitle"),
          detail: tx("liff.checkin.permissionDetail"),
        }),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  if (!token) {
    return (
      <CardContent className="text-sm text-muted-foreground">
        {tx("liff.checkin.noToken")}
      </CardContent>
    )
  }

  return (
    <CardContent className="flex flex-col gap-4">
      {state.phase === "done" ? (
        <p
          className={`text-sm ${state.ok ? "text-foreground" : "text-destructive"}`}
        >
          <span className="font-semibold">{state.title}</span>
          <br />
          {state.detail}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {tx("liff.checkin.intro")}
          </p>
          <Button
            onClick={start}
            disabled={state.phase !== "idle"}
            className="w-full bg-[#06C755] hover:bg-[#06C755]/80"
          >
            {state.phase === "locating"
              ? tx("liff.checkin.locating")
              : state.phase === "submitting"
                ? tx("liff.checkin.submitting")
                : tx("liff.checkin.button")}
          </Button>
        </>
      )}
    </CardContent>
  )
}

export default function CheckinLiffPage() {
  const { tx } = useLocale()
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{tx("liff.checkin.pageTitle")}</CardTitle>
          <CardDescription>{tx("liff.checkin.pageDesc")}</CardDescription>
        </CardHeader>
        <Suspense>
          <CheckinForm />
        </Suspense>
      </Card>
    </main>
  )
}
