"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { GeofenceMap, haversineM } from "@/components/liff/GeofenceMap"

// ── Types ──────────────────────────────────────────────────────────────────

type ShiftInfo = {
  name: string
  label: string
  crosses_midnight: boolean
}

type ClockInfo = {
  employeeName: string
  branchName: string | null
  latitude: number | null
  longitude: number | null
  geofenceRadiusM: number
  geofenceEnabled: boolean
  shift: ShiftInfo | null
  checkInAt: string | null
  checkOutAt: string | null
}

type Phase = "idle" | "locating" | "submitting"

type ResultState =
  | { ok: true; title: string; detail: string }
  | { ok: false; title: string; detail: string }
  | null

// ── Helpers ────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "Asia/Bangkok",
  })
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long",
    timeZone: "Asia/Bangkok",
  })
}

function fmtShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  })
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ClockPage() {
  const now = useClock()

  const [info, setInfo] = useState<ClockInfo | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracyM: number } | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [result, setResult] = useState<ResultState>(null)

  const watchIdRef = useRef<number | null>(null)
  const bestPosRef = useRef<GeolocationPosition | null>(null)

  // ── Fetch clock info ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/clock/info")
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: ClockInfo) => setInfo(data))
      .catch(() => setInfoError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่"))
  }, [])

  // ── GPS watch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation || result) return

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!bestPosRef.current || pos.coords.accuracy < bestPosRef.current.coords.accuracy) {
          bestPosRef.current = pos
        }
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyM: pos.coords.accuracy })
      },
      () => {/* denied */},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
    )
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [result])

  // ── Submit ─────────────────────────────────────────────────────────────
  const submit = useCallback(async (pos: GeolocationPosition) => {
    if (!info) return
    const action = !info.checkInAt ? "checkin" : "checkout"
    setPhase("submitting")

    try {
      const res = await fetch("/api/clock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          captured_at: new Date(pos.timestamp).toISOString(),
        }),
      })
      const data = await res.json().catch(() => ({})) as Record<string, unknown>

      if (res.ok && (data.status === "success" || data.status === "already_checked_in" || data.status === "already_checked_out")) {
        const isCheckIn = action === "checkin"
        const timeText = (data.timeText as string | undefined) ?? ""
        const lateMin = (data.lateMinutes as number | undefined) ?? 0

        let detail = ""
        if (data.status === "already_checked_in") detail = `เช็คอินแล้วตอน ${timeText}`
        else if (data.status === "already_checked_out") detail = `เช็คออกแล้วตอน ${timeText}`
        else if (isCheckIn && lateMin > 0) detail = `เช็คอินสำเร็จ ${timeText} (สาย ${lateMin} นาที)`
        else if (isCheckIn) detail = `เช็คอินสำเร็จ ${timeText} ✓`
        else {
          const mins = (data.workMinutes as number | undefined) ?? 0
          const h = Math.floor(mins / 60), m = mins % 60
          detail = `เช็คออกสำเร็จ ${timeText} — ทำงาน ${h}ชม ${m}นาที`
        }

        setResult({ ok: true, title: isCheckIn ? "เช็คอินสำเร็จ" : "เช็คออกสำเร็จ", detail })
        // Refresh info
        const newInfo = await fetch("/api/clock/info").then(r => r.json()).catch(() => null) as ClockInfo | null
        if (newInfo) setInfo(newInfo)
      } else if (res.status === 403 && (data.error as string) === "outside_geofence") {
        const dist = Math.round((data.distanceM as number) ?? 0)
        setResult({ ok: false, title: "อยู่นอกพื้นที่", detail: `ห่างจากจุดพิกัด ${dist} เมตร กรุณาเข้าใกล้สำนักงาน` })
      } else {
        setResult({ ok: false, title: "เกิดข้อผิดพลาด", detail: (data.error as string | undefined) ?? "กรุณาลองใหม่" })
      }
    } catch {
      setResult({ ok: false, title: "เกิดข้อผิดพลาด", detail: "ไม่สามารถเชื่อมต่อได้" })
    } finally {
      setPhase("idle")
    }
  }, [info])

  const handlePress = useCallback(() => {
    if (!navigator.geolocation) {
      setResult({ ok: false, title: "ไม่รองรับ GPS", detail: "เบราว์เซอร์นี้ไม่รองรับ GPS" })
      return
    }
    setPhase("locating")
    const deadline = Date.now() + 8000
    const poll = setInterval(() => {
      const pos = bestPosRef.current
      if (!pos) return
      if (pos.coords.accuracy <= 50 || Date.now() >= deadline) {
        clearInterval(poll)
        void submit(pos)
      }
    }, 500)
  }, [submit])

  // ── Derived ────────────────────────────────────────────────────────────
  const hasLocation = info?.latitude && info?.longitude
  const distanceM = hasLocation && userPos
    ? haversineM(info.latitude!, info.longitude!, userPos.lat, userPos.lng)
    : undefined

  const isOutside = info?.geofenceEnabled && distanceM !== undefined && distanceM > info.geofenceRadiusM
  const hasCheckedIn = !!info?.checkInAt
  const hasCheckedOut = !!info?.checkOutAt
  const isAllDone = hasCheckedIn && hasCheckedOut
  const canPress = phase === "idle" && !isOutside && !isAllDone && !result

  const btnLabel = !hasCheckedIn ? "ยืนยันเข้างาน" : !hasCheckedOut ? "ยืนยันออกงาน" : "เสร็จสิ้นวันนี้"
  const actionLabel =
    phase === "locating" ? "กำลังหาพิกัด..." :
    phase === "submitting" ? "กำลังบันทึก..." :
    btnLabel

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      {/* Red header */}
      <div className="bg-[#E80012] px-4 pb-4 pt-10 text-white">
        <p className="text-sm text-white/70">
          {info ? info.employeeName : "กำลังโหลด..."}
        </p>
        <p className="mt-1 font-mono text-4xl font-bold tabular-nums tracking-tight">
          {fmtTime(now)}
        </p>
        <p className="mt-0.5 text-xs text-white/70">{fmtDate(now)}</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3 pb-24">

        {infoError && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#E80012]">
            {infoError}
          </div>
        )}

        {/* ── Result card ── */}
        {result && (
          <div className={`rounded-xl border p-4 text-center ${result.ok ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
            <p className="text-2xl">{result.ok ? "✅" : "⛔"}</p>
            <p className={`mt-1 font-semibold ${result.ok ? "text-green-700" : "text-[#E80012]"}`}>{result.title}</p>
            <p className="mt-0.5 text-sm text-gray-500">{result.detail}</p>
            {!result.ok && (
              <button onClick={() => setResult(null)} className="mt-2 text-xs text-gray-400 underline">
                ลองใหม่
              </button>
            )}
          </div>
        )}

        {/* ── Map ── */}
        {hasLocation ? (
          <GeofenceMap
            officeLat={info!.latitude!}
            officeLng={info!.longitude!}
            geofenceRadiusM={info!.geofenceRadiusM}
            officeName={info!.branchName ?? undefined}
            userLat={userPos?.lat}
            userLng={userPos?.lng}
            accuracyM={userPos?.accuracyM}
            distanceM={distanceM}
          />
        ) : (
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">
              {info ? "ไม่มีข้อมูลพิกัดสาขา" : "กำลังโหลดแผนที่..."}
            </p>
          </div>
        )}

        {/* ── Shift info ── */}
        {info?.shift && (
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5">
              <p className="text-xs font-medium text-gray-400">กะการทำงาน</p>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-[#E80012]">
                {info.shift.name}
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="text-lg font-semibold tabular-nums text-gray-900">{info.shift.label}</p>
              {info.shift.crosses_midnight && (
                <p className="mt-0.5 text-xs text-gray-400">ข้ามคืน</p>
              )}
            </div>
            <div className="flex border-t border-gray-50">
              <div className="flex-1 px-4 py-2.5 text-center">
                <p className="text-xs text-gray-400">เข้างาน</p>
                <p className={`mt-0.5 text-sm font-semibold ${hasCheckedIn ? "text-green-600" : "text-gray-300"}`}>
                  {info.checkInAt ? fmtShortTime(info.checkInAt) : "–"}
                </p>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 px-4 py-2.5 text-center">
                <p className="text-xs text-gray-400">ออกงาน</p>
                <p className={`mt-0.5 text-sm font-semibold ${hasCheckedOut ? "text-[#E80012]" : "text-gray-300"}`}>
                  {info.checkOutAt ? fmtShortTime(info.checkOutAt) : "–"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Outside warning ── */}
        {isOutside && distanceM !== undefined && (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm">
            <span className="mt-0.5">⚠️</span>
            <p className="text-red-700">
              อยู่นอกพื้นที่ ({Math.round(distanceM)} เมตร) — กรุณาเข้าใกล้สำนักงาน
            </p>
          </div>
        )}

        {/* ── GPS accuracy ── */}
        {userPos && !isOutside && (
          <p className="text-center text-xs text-gray-400">
            📡 GPS ±{Math.round(userPos.accuracyM)} ม.
            {distanceM !== undefined && ` · ห่าง ${Math.round(distanceM)} ม.`}
          </p>
        )}

        {/* ── Action button ── */}
        {!result && (
          <button
            onClick={handlePress}
            disabled={!canPress || phase !== "idle"}
            className={`w-full rounded-xl py-4 text-base font-semibold text-white transition-opacity ${
              isAllDone
                ? "bg-gray-300"
                : isOutside
                  ? "bg-gray-300"
                  : "bg-[#E80012] active:opacity-80"
            } disabled:opacity-50`}
          >
            {actionLabel}
          </button>
        )}

        <p className="text-center text-xs text-gray-400">ระบบบันทึกพิกัดอัตโนมัติ</p>
      </div>

      <LiffBottomNav />
    </div>
  )
}
