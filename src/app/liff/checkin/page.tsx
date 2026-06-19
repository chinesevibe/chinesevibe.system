"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffPageShell } from "@/components/liff/LiffPageShell"
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

  async function submit(position: GeolocationPosition) {
    setState({ phase: "submitting" })
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_m: position.coords.accuracy,
        captured_at: new Date(position.timestamp).toISOString(),
        source: "liff_geolocation",
        speed_mps:
          typeof position.coords.speed === "number" && Number.isFinite(position.coords.speed)
            ? position.coords.speed
            : null,
        heading:
          typeof position.coords.heading === "number" && Number.isFinite(position.coords.heading)
            ? position.coords.heading
            : null,
        device_platform: navigator.userAgent,
      }),
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

  async function captureBestPosition() {
    const attempts = 3
    let best: GeolocationPosition | null = null

    const getPosition = () =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      })

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const position = await getPosition()
      if (!best || position.coords.accuracy < best.coords.accuracy) {
        best = position
      }
      if (position.coords.accuracy <= 80) {
        return position
      }
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }

    if (!best) throw new Error("no_position")
    return best
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
    captureBestPosition()
      .then((pos) => submit(pos))
      .catch(() =>
        setState({
          phase: "done",
          ok: false,
          title: tx("liff.checkin.permissionTitle"),
          detail: tx("liff.checkin.permissionDetail"),
        })
      )
  }

  if (!token) {
    return (
      <p className="px-4 py-6 text-sm text-gray-400">{tx("liff.checkin.noToken")}</p>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {state.phase === "done" ? (
        <div
          className={`rounded-xl border p-5 text-center ${
            state.ok
              ? "border-green-100 bg-green-50"
              : "border-red-100 bg-red-50"
          }`}
        >
          <p className={`text-2xl ${state.ok ? "text-green-600" : "text-[#E80012]"}`}>
            {state.ok ? "✓" : "✕"}
          </p>
          <p className={`mt-2 font-semibold ${state.ok ? "text-green-700" : "text-[#E80012]"}`}>
            {state.title}
          </p>
          <p className="mt-1 text-sm text-gray-500">{state.detail}</p>
        </div>
      ) : (
        <>
          {/* Status pill */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 text-center shadow-sm">
            <p className="text-4xl">
              {state.phase === "idle" ? "📍" : state.phase === "locating" ? "🔍" : "⏳"}
            </p>
            <p className="mt-3 text-sm text-gray-500">
              {state.phase === "idle"
                ? tx("liff.checkin.intro")
                : state.phase === "locating"
                  ? tx("liff.checkin.locating")
                  : tx("liff.checkin.submitting")}
            </p>
            {state.phase === "idle" && (
              <p className="mt-1 text-xs text-gray-400">
                ระบบจะพยายามจับพิกัดความละเอียดสูงก่อนส่งเช็กอิน
              </p>
            )}
          </div>

          <button
            onClick={start}
            disabled={state.phase !== "idle"}
            className="w-full rounded-xl bg-[#E80012] py-4 text-base font-medium text-white disabled:opacity-50 active:opacity-80"
          >
            {state.phase === "idle"
              ? tx("liff.checkin.button")
              : state.phase === "locating"
                ? `${tx("liff.checkin.locating")}...`
                : `${tx("liff.checkin.submitting")}...`}
          </button>
        </>
      )}
    </div>
  )
}

export default function CheckinLiffPage() {
  const { tx } = useLocale()
  return (
    <LiffPageShell
      title={tx("liff.checkin.pageTitle")}
      subtitle={tx("liff.checkin.pageDesc")}
    >
      <Suspense>
        <CheckinForm />
      </Suspense>
      <LiffBottomNav />
    </LiffPageShell>
  )
}
