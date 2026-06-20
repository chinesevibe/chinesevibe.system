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

type Phase = "idle" | "locating_in" | "locating_out" | "submitting_in" | "submitting_out"

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
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Asia/Bangkok",
  })
}

function fmtShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  })
}

function signalLabel(accuracyM: number): string {
  if (accuracyM <= 10) return "ดีมาก"
  if (accuracyM <= 25) return "ดี"
  if (accuracyM <= 50) return "พอใช้"
  return "อ่อน"
}

function SignalBars({ accuracyM }: { accuracyM: number }) {
  const level = accuracyM <= 10 ? 4 : accuracyM <= 25 ? 3 : accuracyM <= 50 ? 2 : 1
  const heights = [4, 7, 11, 16]
  return (
    <span className="flex items-end gap-0.5" style={{ height: 16 }}>
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-sm"
          style={{
            height: h,
            background: i < level ? "#16a34a" : "#d1d5db",
          }}
        />
      ))}
    </span>
  )
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
  const doSubmit = useCallback(async (action: "checkin" | "checkout", pos: GeolocationPosition) => {
    if (!info) return
    setPhase(action === "checkin" ? "submitting_in" : "submitting_out")

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
        const newInfo = await fetch("/api/clock/info").then(r => r.json()).catch(() => null) as ClockInfo | null
        if (newInfo) setInfo(newInfo)
      } else if (res.status === 403 && (data.error as string) === "outside_geofence") {
        const dist = Math.round((data.distanceM as number) ?? 0)
        setResult({ ok: false, title: "อยู่นอกพื้นที่", detail: `ห่างจากจุดพิกัด ${dist} เมตร กรุณาเข้าใกล้สำนักงาน` })
      } else if (res.status === 409 && (data.error as string) === "requires_retro_checkout") {
        const timeText = (data.timeText as string | undefined) ?? ""
        setResult({
          ok: false,
          title: "มี session ค้าง",
          detail: timeText
            ? `พบการเข้างานค้างตั้งแต่ ${timeText} กรุณาเช็คออกย้อนหลังหรือรอระบบปิดอัตโนมัติ 06:00 น.`
            : "กรุณาเช็คออกย้อนหลังหรือรอระบบปิดอัตโนมัติ 06:00 น.",
        })
      } else {
        setResult({ ok: false, title: "เกิดข้อผิดพลาด", detail: (data.error as string | undefined) ?? "กรุณาลองใหม่" })
      }
    } catch {
      setResult({ ok: false, title: "เกิดข้อผิดพลาด", detail: "ไม่สามารถเชื่อมต่อได้" })
    } finally {
      setPhase("idle")
    }
  }, [info])

  const handlePress = useCallback((action: "checkin" | "checkout") => {
    if (!navigator.geolocation) {
      setResult({ ok: false, title: "ไม่รองรับ GPS", detail: "เบราว์เซอร์นี้ไม่รองรับ GPS" })
      return
    }
    setPhase(action === "checkin" ? "locating_in" : "locating_out")
    const deadline = Date.now() + 8000
    const poll = setInterval(() => {
      const pos = bestPosRef.current
      if (!pos) return
      if (pos.coords.accuracy <= 50 || Date.now() >= deadline) {
        clearInterval(poll)
        void doSubmit(action, pos)
      }
    }, 500)
  }, [doSubmit])

  // ── Derived ────────────────────────────────────────────────────────────
  const hasLocation = info?.latitude && info?.longitude
  const distanceM = hasLocation && userPos
    ? haversineM(info.latitude!, info.longitude!, userPos.lat, userPos.lng)
    : undefined

  const isOutside = info?.geofenceEnabled && distanceM !== undefined && distanceM > info.geofenceRadiusM
  const hasCheckedIn = !!info?.checkInAt
  const hasCheckedOut = !!info?.checkOutAt
  const isIdle = phase === "idle"

  const checkinDisabled = hasCheckedIn || !!isOutside || !isIdle || !!result
  const checkoutDisabled = !hasCheckedIn || hasCheckedOut || !!isOutside || !isIdle || !!result

  const checkinLabel =
    phase === "locating_in" ? "กำลังหาพิกัด..." :
    phase === "submitting_in" ? "กำลังบันทึก..." :
    "เช็คอินเข้างาน"

  const checkoutLabel =
    phase === "locating_out" ? "กำลังหาพิกัด..." :
    phase === "submitting_out" ? "กำลังบันทึก..." :
    "เช็คเอาท์ออกงาน"

  const mapsUrl = hasLocation
    ? `https://maps.google.com/?q=${info!.latitude},${info!.longitude}`
    : null

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 pb-3 pt-12">
        <button
          onClick={() => window.history.back()}
          className="text-xl font-semibold text-[#E80012] px-1"
        >
          ‹
        </button>
        <p className="text-base font-bold text-gray-900">เช็คอิน / เช็คเอาท์</p>
        <div className="relative px-1">
          <span className="text-xl text-gray-500">🔔</span>
          <span className="absolute right-1 top-0 h-2 w-2 rounded-full border border-white bg-[#E80012]" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3 pb-28">

        {infoError && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#E80012]">
            {infoError}
          </div>
        )}

        {/* ── Result card ── */}
        {result && (
          <div className={`rounded-2xl border p-4 text-center ${result.ok ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"}`}>
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
          <div className="flex h-[200px] items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <p className="text-sm text-gray-400">
              {info ? "ไม่มีข้อมูลพิกัดสาขา" : "กำลังโหลดแผนที่..."}
            </p>
          </div>
        )}

        {/* ── Coordinates card ── */}
        {hasLocation && (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-base">
                📍
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 tabular-nums">
                  พิกัดงาน: {info!.latitude!.toFixed(4)}, {info!.longitude!.toFixed(4)}
                </p>
                {info!.branchName && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{info!.branchName}</p>
                )}
              </div>
            </div>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-[#E80012]"
              >
                🗺 ดูบนแผนที่
              </a>
            )}
          </div>
        )}

        {/* ── Status card ── */}
        {!result && (
          userPos === null ? (
            <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg">
                ⊙
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500">กำลังหาพิกัด GPS...</p>
                <p className="mt-0.5 text-xs text-gray-400">รอสักครู่ระบบกำลังระบุตำแหน่ง</p>
              </div>
            </div>
          ) : isOutside ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#E80012] text-lg text-white font-bold">
                ✕
              </div>
              <div>
                <p className="text-sm font-bold text-[#E80012]">อยู่นอกพื้นที่ กรุณาเข้าใกล้</p>
                <p className="mt-0.5 text-xs text-red-500">
                  คุณอยู่ห่างจากจุดพิกัด {Math.round(distanceM!)} เมตร (ระยะอนุญาต {info!.geofenceRadiusM} ม.)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-lg text-white font-bold">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-green-700">อยู่ในระยะ สามารถเช็คอินได้</p>
                <p className="mt-0.5 text-xs text-green-600">
                  {distanceM !== undefined
                    ? `คุณอยู่ห่างจากจุดพิกัด ${Math.round(distanceM)} เมตร`
                    : "อยู่ในพื้นที่"}
                </p>
              </div>
            </div>
          )
        )}

        {/* ── GPS accuracy + Signal strength ── */}
        {userPos && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-400">ความแม่นยำ GPS</p>
              <p className="mt-1 text-sm font-bold text-gray-900">⊙ ±{Math.round(userPos.accuracyM)} เมตร</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-400">สถานะสัญญาณ</p>
              <div className="mt-1 flex items-center gap-1.5">
                <SignalBars accuracyM={userPos.accuracyM} />
                <p className="text-sm font-bold text-gray-900">{signalLabel(userPos.accuracyM)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Shift info ── */}
        {info?.shift && (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5">
              <p className="text-xs font-medium text-gray-400">กะการทำงาน</p>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-[#E80012]">
                {info.shift.name}
              </span>
            </div>
            <div className="flex">
              <div className="flex-1 px-4 py-2.5 text-center">
                <p className="text-xs text-gray-400">เข้างาน</p>
                <p className={`mt-0.5 text-sm font-bold ${hasCheckedIn ? "text-green-600" : "text-gray-300"}`}>
                  {info.checkInAt ? fmtShortTime(info.checkInAt) : info.shift.label.split("–")[0]?.trim() ?? "–"}
                </p>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 px-4 py-2.5 text-center">
                <p className="text-xs text-gray-400">ออกงาน</p>
                <p className={`mt-0.5 text-sm font-bold ${hasCheckedOut ? "text-[#E80012]" : "text-gray-300"}`}>
                  {info.checkOutAt ? fmtShortTime(info.checkOutAt) : info.shift.label.split("–")[1]?.trim() ?? "–"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Date/time card ── */}
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xl">📅</span>
          <p className="text-sm font-semibold text-gray-900">
            {fmtDate(now)} เวลา {fmtTime(now)} น.
          </p>
        </div>

        {/* ── Action buttons ── */}
        {!result && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePress("checkin")}
              disabled={checkinDisabled}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-green-600 py-4 text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-40"
            >
              <span>↪</span> {checkinLabel}
            </button>
            <button
              onClick={() => handlePress("checkout")}
              disabled={checkoutDisabled}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#E80012] py-4 text-sm font-bold text-white transition-opacity active:opacity-80 disabled:opacity-40"
            >
              <span>↩</span> {checkoutLabel}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">🛡 ระบบบันทึกพิกัดอัตโนมัติ</p>
      </div>

      <LiffBottomNav />
    </div>
  )
}
