"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { GeofenceMap, haversineM } from "@/components/liff/GeofenceMap"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { MessageKey } from "@/lib/i18n/translate"

// ── Types ──────────────────────────────────────────────────────────────────

type BranchLocation = {
  branchName: string
  latitude: number
  longitude: number
  geofenceRadiusM: number
  geofenceEnabled: boolean
}

type CheckinState =
  | { phase: "idle" }
  | { phase: "locating" }
  | { phase: "submitting" }
  | { phase: "done"; title: string; detail: string; ok: boolean }

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Main form ──────────────────────────────────────────────────────────────

function CheckinForm() {
  const { tx } = useLocale()
  const token = useSearchParams().get("token")

  const [state, setState] = useState<CheckinState>({ phase: "idle" })
  const [branch, setBranch] = useState<BranchLocation | null>(null)
  const [userPos, setUserPos] = useState<{
    lat: number
    lng: number
    accuracyM: number
    raw: GeolocationPosition
  } | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const bestPosRef = useRef<GeolocationPosition | null>(null)

  // ── Load branch location ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetch(`/api/checkin/location?token=${encodeURIComponent(token)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: BranchLocation | null) => { if (data) setBranch(data) })
      .catch(() => {/* silent — map just won't show */})
  }, [token])

  // ── Live GPS watch ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation || state.phase === "done") return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Keep the most accurate reading
        if (
          !bestPosRef.current ||
          pos.coords.accuracy < bestPosRef.current.coords.accuracy
        ) {
          bestPosRef.current = pos
        }
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
          raw: pos,
        })
      },
      () => {/* permission denied — map shows without user dot */},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [state.phase])

  // ── Submit ──────────────────────────────────────────────────────────────
  const submit = useCallback(
    async (position: GeolocationPosition) => {
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
            typeof position.coords.speed === "number" &&
            Number.isFinite(position.coords.speed)
              ? position.coords.speed
              : null,
          heading:
            typeof position.coords.heading === "number" &&
            Number.isFinite(position.coords.heading)
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
    },
    [token, tx]
  )

  const start = useCallback(() => {
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

    // Wait up to 8 s for accuracy ≤ 50 m, then use best available
    const deadline = Date.now() + 8000
    const poll = setInterval(() => {
      const pos = bestPosRef.current
      if (!pos) return
      if (pos.coords.accuracy <= 50 || Date.now() >= deadline) {
        clearInterval(poll)
        void submit(pos)
      }
    }, 500)
  }, [submit, tx])

  // ── Derived state ───────────────────────────────────────────────────────
  const distanceM =
    branch && userPos
      ? haversineM(branch.latitude, branch.longitude, userPos.lat, userPos.lng)
      : undefined

  const isOutside =
    branch?.geofenceEnabled &&
    distanceM !== undefined &&
    distanceM > branch.geofenceRadiusM

  const canSubmit =
    state.phase === "idle" && !isOutside

  if (!token) {
    return (
      <p className="px-4 py-6 text-sm text-gray-400">
        {tx("liff.checkin.noToken")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* ── Result state ─────────────────────────────────── */}
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
          {/* ── Map ──────────────────────────────────────── */}
          {branch ? (
            <GeofenceMap
              officeLat={branch.latitude}
              officeLng={branch.longitude}
              geofenceRadiusM={branch.geofenceRadiusM}
              officeName={branch.branchName}
              userLat={userPos?.lat}
              userLng={userPos?.lng}
              accuracyM={userPos?.accuracyM}
              distanceM={distanceM}
            />
          ) : (
            <div className="flex h-[240px] items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
              <p className="text-sm text-gray-400">กำลังโหลดแผนที่...</p>
            </div>
          )}

          {/* ── Info row ─────────────────────────────────── */}
          {branch && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm">
              <span className="text-lg">📍</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{branch.branchName}</p>
                <p className="text-xs text-gray-400">
                  {branch.latitude.toFixed(4)}, {branch.longitude.toFixed(4)}
                </p>
              </div>
              {userPos && (
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400">GPS ±{Math.round(userPos.accuracyM)}ม.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Outside geofence warning ──────────────────── */}
          {isOutside && distanceM !== undefined && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm">
              <span className="mt-0.5 text-base">⚠️</span>
              <p className="text-red-700">
                คุณอยู่นอกพื้นที่ ({Math.round(distanceM)} เมตร จากจุดพิกัด){" "}
                กรุณาเข้าใกล้สำนักงานก่อนเช็คอิน
              </p>
            </div>
          )}

          {/* ── Status note ──────────────────────────────── */}
          {state.phase === "idle" && !isOutside && (
            <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm">
              <span className="text-base">✅</span>
              <p className="text-green-700">
                {distanceM !== undefined
                  ? `อยู่ในระยะ สามารถเช็คอินได้ — ห่างจากจุดพิกัด ${Math.round(distanceM)} เมตร`
                  : "กำลังตรวจสอบพิกัด..."}
              </p>
            </div>
          )}

          {/* ── Date / time ──────────────────────────────── */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="text-base">🗓️</span>
            <p className="text-gray-700">
              {new Date().toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* ── Button ───────────────────────────────────── */}
          <button
            onClick={start}
            disabled={!canSubmit || state.phase !== "idle"}
            className="w-full rounded-xl bg-[#E80012] py-4 text-base font-medium text-white disabled:opacity-40 active:opacity-80"
          >
            {state.phase === "idle"
              ? isOutside
                ? "⛔ อยู่นอกพื้นที่"
                : tx("liff.checkin.button")
              : state.phase === "locating"
                ? `${tx("liff.checkin.locating")}...`
                : `${tx("liff.checkin.submitting")}...`}
          </button>

          <p className="text-center text-xs text-gray-400">
            ระบบบันทึกพิกัดอัตโนมัติ
          </p>
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
