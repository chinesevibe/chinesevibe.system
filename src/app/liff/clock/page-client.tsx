"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffLanguageSwitcher } from "@/components/liff/LiffLanguageSwitcher"
import { GeofenceMap, haversineM } from "@/components/liff/GeofenceMap"
import { LiffLoginPrompt } from "@/features/liff/LiffLoginPrompt"
import { useLocale } from "@/features/portal/LocaleProvider"
import type { AttendanceMonthSummary } from "@/lib/attendance/month-summary"
import { isAppLocale, type AppLocale } from "@/lib/i18n/types"
import { checkinConfirmFlex } from "@/lib/line/flex/checkin"
import { checkoutSummaryFlex } from "@/lib/line/flex/checkout"

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

async function sendLineFallbackMessage({
  action,
  locale,
  employeeName,
  timeText,
  lateMinutes,
  checkInAt,
  checkOutAt,
  workMinutes,
  monthSummary,
}: {
  action: "checkin" | "checkout"
  locale: AppLocale
  employeeName: string
  timeText: string
  lateMinutes?: number
  checkInAt?: string
  checkOutAt?: string
  workMinutes?: number
  monthSummary: AttendanceMonthSummary
}) {
  const liff = (await import("@line/liff")).default
  if (!liff.isInClient() || !liff.isApiAvailable("sendMessages")) return

  const message =
    action === "checkin"
      ? checkinConfirmFlex({
          name: employeeName,
          timeText,
          lateMinutes: lateMinutes ?? 0,
          monthSummary,
          locale,
        })
      : checkoutSummaryFlex({
          name: employeeName,
          inText: checkInAt
            ? new Date(checkInAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Bangkok",
              })
            : "",
          outText: checkOutAt
            ? new Date(checkOutAt).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Bangkok",
              })
            : timeText,
          workMinutes: workMinutes ?? 0,
          showWorkDuration: true,
          monthSummary,
          locale,
        })

  await liff.sendMessages([message as Parameters<typeof liff.sendMessages>[0][number]])
}

const CLOCK_COPY: Record<
  AppLocale,
  {
    title: string
    loadingError: string
    checkedInAt: (time: string) => string
    checkedOutAt: (time: string) => string
    checkInSuccess: string
    checkOutSuccess: string
    checkInSuccessAt: (time: string) => string
    checkInLateAt: (time: string, minutes: number) => string
    checkOutSuccessAt: (time: string, hours: number, minutes: number) => string
    outsideTitle: string
    outsideDetail: (distance: number) => string
    genericError: string
    retry: string
    noGps: string
    noGpsDetail: string
    connectError: string
    staleSessionTitle: string
    staleSessionDetailWithTime: (time: string) => string
    staleSessionDetail: string
    tooSoonTitle: string
    tooSoonDetail: (time: string) => string
    locating: string
    submitting: string
    checkInButton: string
    checkOutButton: string
    gpsLoading: string
    gpsLoadingDesc: string
    inRange: string
    inRangeDetail: (distance?: number) => string
    officeCoords: string
    viewMap: string
    noBranchLocation: string
    loadingMap: string
    gpsAccuracy: string
    signalStatus: string
    shiftTitle: string
    checkInLabel: string
    checkOutLabel: string
    dateTimePrefix: string
    autoTrack: string
  }
> = {
  th: {
    title: "เช็คอิน / เช็คเอาท์",
    loadingError: "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่",
    checkedInAt: (time) => `เช็คอินแล้วตอน ${time}`,
    checkedOutAt: (time) => `เช็คออกแล้วตอน ${time}`,
    checkInSuccess: "เช็คอินสำเร็จ",
    checkOutSuccess: "เช็คออกสำเร็จ",
    checkInSuccessAt: (time) => `เช็คอินสำเร็จ ${time} ✓`,
    checkInLateAt: (time, minutes) => `เช็คอินสำเร็จ ${time} (สาย ${minutes} นาที)`,
    checkOutSuccessAt: (time, hours, minutes) =>
      `เช็คออกสำเร็จ ${time} — ทำงาน ${hours}ชม ${minutes}นาที`,
    outsideTitle: "อยู่นอกพื้นที่",
    outsideDetail: (distance) => `ห่างจากจุดพิกัด ${distance} เมตร กรุณาเข้าใกล้สำนักงาน`,
    genericError: "เกิดข้อผิดพลาด",
    retry: "ลองใหม่",
    noGps: "ไม่รองรับ GPS",
    noGpsDetail: "เบราว์เซอร์นี้ไม่รองรับ GPS",
    connectError: "ไม่สามารถเชื่อมต่อได้",
    staleSessionTitle: "มี session ค้าง",
    staleSessionDetailWithTime: (time) =>
      `พบการเข้างานค้างตั้งแต่ ${time} กรุณาเช็คออกย้อนหลังหรือรอระบบปิดอัตโนมัติ 06:00 น.`,
    staleSessionDetail: "กรุณาเช็คออกย้อนหลังหรือรอระบบปิดอัตโนมัติ 06:00 น.",
    tooSoonTitle: "ยังเช็คอินใหม่ไม่ได้",
    tooSoonDetail: (time) => `เช็คอินใหม่ได้หลัง ${time} น.`,
    locating: "กำลังหาพิกัด...",
    submitting: "กำลังบันทึก...",
    checkInButton: "เช็คอินเข้างาน",
    checkOutButton: "เช็คเอาท์ออกงาน",
    gpsLoading: "กำลังหาพิกัด GPS...",
    gpsLoadingDesc: "รอสักครู่ระบบกำลังระบุตำแหน่ง",
    inRange: "อยู่ในระยะ สามารถเช็คอินได้",
    inRangeDetail: (distance) =>
      distance !== undefined ? `คุณอยู่ห่างจากจุดพิกัด ${distance} เมตร` : "อยู่ในพื้นที่",
    officeCoords: "พิกัดงาน",
    viewMap: "ดูบนแผนที่",
    noBranchLocation: "ไม่มีข้อมูลพิกัดสาขา",
    loadingMap: "กำลังโหลดแผนที่...",
    gpsAccuracy: "ความแม่นยำ GPS",
    signalStatus: "สถานะสัญญาณ",
    shiftTitle: "กะการทำงาน",
    checkInLabel: "เข้างาน",
    checkOutLabel: "ออกงาน",
    dateTimePrefix: "เวลา",
    autoTrack: "🛡 ระบบบันทึกพิกัดอัตโนมัติ",
  },
  en: {
    title: "Clock in / Clock out",
    loadingError: "Unable to load data. Please try again.",
    checkedInAt: (time) => `Already checked in at ${time}`,
    checkedOutAt: (time) => `Already checked out at ${time}`,
    checkInSuccess: "Clock-in successful",
    checkOutSuccess: "Clock-out successful",
    checkInSuccessAt: (time) => `Clock-in successful ${time} ✓`,
    checkInLateAt: (time, minutes) => `Clock-in successful ${time} (${minutes} min late)`,
    checkOutSuccessAt: (time, hours, minutes) =>
      `Clock-out successful ${time} — worked ${hours}h ${minutes}m`,
    outsideTitle: "Outside allowed area",
    outsideDetail: (distance) => `${distance}m from the office point. Please move closer.`,
    genericError: "Something went wrong",
    retry: "Try again",
    noGps: "GPS not supported",
    noGpsDetail: "This browser does not support GPS.",
    connectError: "Unable to connect",
    staleSessionTitle: "Open session found",
    staleSessionDetailWithTime: (time) =>
      `An earlier session has been open since ${time}. Please submit a retro checkout or wait for auto-close at 06:00.`,
    staleSessionDetail: "Please submit a retro checkout or wait for auto-close at 06:00.",
    tooSoonTitle: "Too soon to clock in again",
    tooSoonDetail: (time) => `Next clock-in available after ${time}`,
    locating: "Getting location...",
    submitting: "Saving...",
    checkInButton: "Clock in",
    checkOutButton: "Clock out",
    gpsLoading: "Getting GPS location...",
    gpsLoadingDesc: "Please wait while we locate you.",
    inRange: "You are in range and can clock in",
    inRangeDetail: (distance) =>
      distance !== undefined ? `You are ${distance}m from the office point` : "You are in range",
    officeCoords: "Work coordinates",
    viewMap: "View map",
    noBranchLocation: "No branch coordinates available",
    loadingMap: "Loading map...",
    gpsAccuracy: "GPS accuracy",
    signalStatus: "Signal status",
    shiftTitle: "Work session",
    checkInLabel: "Check in",
    checkOutLabel: "Check out",
    dateTimePrefix: "Time",
    autoTrack: "🛡 Location is recorded automatically",
  },
  zh: {
    title: "上班 / 下班打卡",
    loadingError: "无法加载数据，请重试。",
    checkedInAt: (time) => `已于 ${time} 打卡上班`,
    checkedOutAt: (time) => `已于 ${time} 打卡下班`,
    checkInSuccess: "上班打卡成功",
    checkOutSuccess: "下班打卡成功",
    checkInSuccessAt: (time) => `上班打卡成功 ${time} ✓`,
    checkInLateAt: (time, minutes) => `上班打卡成功 ${time}（迟到 ${minutes} 分钟）`,
    checkOutSuccessAt: (time, hours, minutes) =>
      `下班打卡成功 ${time} — 工作 ${hours}小时 ${minutes}分钟`,
    outsideTitle: "不在允许范围内",
    outsideDetail: (distance) => `距离办公点 ${distance} 米，请靠近后再试。`,
    genericError: "发生错误",
    retry: "重试",
    noGps: "不支持 GPS",
    noGpsDetail: "此浏览器不支持 GPS。",
    connectError: "无法连接",
    staleSessionTitle: "发现未结束的 session",
    staleSessionDetailWithTime: (time) =>
      `发现从 ${time} 开始的未结束 session，请先补签下班或等待系统于 06:00 自动关闭。`,
    staleSessionDetail: "请先补签下班或等待系统于 06:00 自动关闭。",
    tooSoonTitle: "尚未到可打卡时间",
    tooSoonDetail: (time) => `可于 ${time} 后重新打卡`,
    locating: "正在定位...",
    submitting: "正在保存...",
    checkInButton: "上班打卡",
    checkOutButton: "下班打卡",
    gpsLoading: "正在获取 GPS 位置...",
    gpsLoadingDesc: "请稍候，系统正在定位。",
    inRange: "您已在允许范围内，可以打卡",
    inRangeDetail: (distance) =>
      distance !== undefined ? `您距离办公点 ${distance} 米` : "您在允许范围内",
    officeCoords: "工作坐标",
    viewMap: "查看地图",
    noBranchLocation: "没有分店坐标数据",
    loadingMap: "正在加载地图...",
    gpsAccuracy: "GPS 精度",
    signalStatus: "信号状态",
    shiftTitle: "工作时段",
    checkInLabel: "上班",
    checkOutLabel: "下班",
    dateTimePrefix: "时间",
    autoTrack: "🛡 系统会自动记录定位",
  },
  my: {
    title: "အလုပ်ဝင် / အလုပ်ဆင်း မှတ်တမ်း",
    loadingError: "ဒေတာ မဖွင့်နိုင်ပါ။ ထပ်စမ်းပါ။",
    checkedInAt: (time) => `${time} တွင် အလုပ်ဝင်မှတ်တမ်းရှိပြီးသား`,
    checkedOutAt: (time) => `${time} တွင် အလုပ်ဆင်းမှတ်တမ်းရှိပြီးသား`,
    checkInSuccess: "အလုပ်ဝင် မှတ်တမ်းတင်ပြီး",
    checkOutSuccess: "အလုပ်ဆင်း မှတ်တမ်းတင်ပြီး",
    checkInSuccessAt: (time) => `${time} တွင် အလုပ်ဝင် မှတ်တမ်းတင်ပြီး ✓`,
    checkInLateAt: (time, minutes) => `${time} တွင် အလုပ်ဝင် မှတ်တမ်းတင်ပြီး (${minutes} မိနစ် နောက်ကျ)`,
    checkOutSuccessAt: (time, hours, minutes) =>
      `${time} တွင် အလုပ်ဆင်း မှတ်တမ်းတင်ပြီး — ${hours} နာရီ ${minutes} မိနစ် အလုပ်လုပ်ခဲ့သည်`,
    outsideTitle: "သတ်မှတ်ဧရိယာပြင်ပတွင်ရှိနေသည်",
    outsideDetail: (distance) => `ရုံးတည်နေရာမှ ${distance} မီတာ ဝေးနေပါသည်။ အနီးကပ်လာပြီး ထပ်စမ်းပါ။`,
    genericError: "အမှားဖြစ်ပွားသည်",
    retry: "ထပ်စမ်းပါ",
    noGps: "GPS မရနိုင်ပါ",
    noGpsDetail: "ဤ browser သည် GPS ကို မထောက်ပံ့ပါ။",
    connectError: "ချိတ်ဆက်၍ မရပါ",
    staleSessionTitle: "မပြီးသေးသော session တွေ့ရှိသည်",
    staleSessionDetailWithTime: (time) =>
      `${time} ကတည်းက ဖွင့်ထားသော session ရှိနေသည်။ နောက်ကြောင်းပြန် အလုပ်ဆင်းတင်ပါ သို့မဟုတ် 06:00 အလိုအလျောက်ပိတ်ချိန်ကို စောင့်ပါ။`,
    staleSessionDetail: "နောက်ကြောင်းပြန် အလုပ်ဆင်းတင်ပါ သို့မဟုတ် 06:00 အလိုအလျောက်ပိတ်ချိန်ကို စောင့်ပါ။",
    tooSoonTitle: "ပြန်မဝင်နိုင်သေးပါ",
    tooSoonDetail: (time) => `${time} နောက်မှ ပြန်ဝင်နိုင်သည်`,
    locating: "တည်နေရာ ရှာနေသည်...",
    submitting: "သိမ်းနေသည်...",
    checkInButton: "အလုပ်ဝင် မှတ်တမ်းတင်ရန်",
    checkOutButton: "အလုပ်ဆင်း မှတ်တမ်းတင်ရန်",
    gpsLoading: "GPS တည်နေရာ ရှာနေသည်...",
    gpsLoadingDesc: "ခဏစောင့်ပါ၊ စနစ်က သင့်တည်နေရာကို ရှာနေသည်။",
    inRange: "သင်သည် သတ်မှတ်ဧရိယာအတွင်းရှိပြီး မှတ်တမ်းတင်နိုင်ပါသည်",
    inRangeDetail: (distance) =>
      distance !== undefined ? `သင်သည် ရုံးတည်နေရာမှ ${distance} မီတာ ဝေးသည်` : "သင်သည် သတ်မှတ်ဧရိယာအတွင်းရှိသည်",
    officeCoords: "အလုပ်တည်နေရာ",
    viewMap: "မြေပုံကြည့်ရန်",
    noBranchLocation: "ဌာနခွဲတည်နေရာ မရှိပါ",
    loadingMap: "မြေပုံ ဖွင့်နေသည်...",
    gpsAccuracy: "GPS တိကျမှု",
    signalStatus: "လိုင်းအခြေအနေ",
    shiftTitle: "အလုပ်ချိန်",
    checkInLabel: "အလုပ်ဝင်",
    checkOutLabel: "အလုပ်ဆင်း",
    dateTimePrefix: "အချိန်",
    autoTrack: "🛡 တည်နေရာကို အလိုအလျောက် မှတ်တမ်းတင်သည်",
  },
}

function localeTag(locale: AppLocale) {
  switch (locale) {
    case "en":
      return "en-GB"
    case "zh":
      return "zh-TW"
    case "my":
      return "my-MM"
    default:
      return "th-TH"
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function fmtTime(date: Date, locale: AppLocale) {
  return date.toLocaleTimeString(localeTag(locale), {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "Asia/Bangkok",
  })
}

function fmtDate(date: Date, locale: AppLocale) {
  return date.toLocaleDateString(localeTag(locale), {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Asia/Bangkok",
  })
}

function fmtShortTime(iso: string, locale: AppLocale) {
  return new Date(iso).toLocaleTimeString(localeTag(locale), {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
  })
}

function signalLabel(accuracyM: number, locale: AppLocale): string {
  if (locale === "en") {
    if (accuracyM <= 10) return "Excellent"
    if (accuracyM <= 25) return "Good"
    if (accuracyM <= 50) return "Fair"
    return "Weak"
  }
  if (locale === "zh") {
    if (accuracyM <= 10) return "很好"
    if (accuracyM <= 25) return "良好"
    if (accuracyM <= 50) return "一般"
    return "较弱"
  }
  if (locale === "my") {
    if (accuracyM <= 10) return "အလွန်ကောင်း"
    if (accuracyM <= 25) return "ကောင်း"
    if (accuracyM <= 50) return "အသင့်တင့်"
    return "အားနည်း"
  }
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
  const searchParams = useSearchParams()
  const { locale: providerLocale, tx } = useLocale()
  const urlLocale = searchParams.get("lang")
  const locale: AppLocale = isAppLocale(urlLocale) ? urlLocale : providerLocale
  const copy = CLOCK_COPY[locale]

  const [info, setInfo] = useState<ClockInfo | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracyM: number } | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [result, setResult] = useState<ResultState>(null)

  const watchIdRef = useRef<number | null>(null)
  const bestPosRef = useRef<GeolocationPosition | null>(null)

  // ── Fetch clock info ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    fetch("/api/clock/info")
      .then(async (r) => {
        if (r.status === 401) {
          if (!cancelled) {
            setNeedsLogin(true)
            setInfoError(null)
          }
          return null
        }
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((data: ClockInfo | null) => {
        if (!cancelled && data) setInfo(data)
      })
      .catch(() => {
        if (!cancelled) setInfoError(copy.loadingError)
      })
    return () => {
      cancelled = true
    }
  }, [copy.loadingError])

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
        if (data.status === "already_checked_in") detail = copy.checkedInAt(timeText)
        else if (data.status === "already_checked_out") detail = copy.checkedOutAt(timeText)
        else if (isCheckIn && lateMin > 0) detail = copy.checkInLateAt(timeText, lateMin)
        else if (isCheckIn) detail = copy.checkInSuccessAt(timeText)
        else {
          const mins = (data.workMinutes as number | undefined) ?? 0
          const h = Math.floor(mins / 60), m = mins % 60
          detail = copy.checkOutSuccessAt(timeText, h, m)
        }

        if (
          data.status === "success" &&
          data.lineNotified !== true &&
          typeof data.employeeName === "string" &&
          data.monthSummary
        ) {
          void sendLineFallbackMessage({
            action,
            locale,
            employeeName: data.employeeName,
            timeText,
            lateMinutes: lateMin,
            checkInAt: typeof data.checkInAt === "string" ? data.checkInAt : undefined,
            checkOutAt: typeof data.checkOutAt === "string" ? data.checkOutAt : undefined,
            workMinutes: typeof data.workMinutes === "number" ? data.workMinutes : undefined,
            monthSummary: data.monthSummary as AttendanceMonthSummary,
          }).catch((error) => {
            console.error("LIFF fallback send failed:", error)
          })
        }

        setResult({ ok: true, title: isCheckIn ? copy.checkInSuccess : copy.checkOutSuccess, detail })
        const newInfo = await fetch("/api/clock/info").then(r => r.json()).catch(() => null) as ClockInfo | null
        if (newInfo) setInfo(newInfo)
      } else if (res.status === 403 && (data.error as string) === "outside_geofence") {
        const dist = Math.round((data.distanceM as number) ?? 0)
        setResult({ ok: false, title: copy.outsideTitle, detail: copy.outsideDetail(dist) })
      } else if (res.status === 409 && (data.error as string) === "requires_retro_checkout") {
        const timeText = (data.timeText as string | undefined) ?? ""
        setResult({
          ok: false,
          title: copy.staleSessionTitle,
          detail: timeText ? copy.staleSessionDetailWithTime(timeText) : copy.staleSessionDetail,
        })
      } else if (res.status === 409 && (data.error as string) === "too_soon_after_checkout") {
        const timeText = (data.timeText as string | undefined) ?? "06:00"
        setResult({
          ok: false,
          title: copy.tooSoonTitle,
          detail: copy.tooSoonDetail(timeText),
        })
      } else {
        setResult({ ok: false, title: copy.genericError, detail: (data.error as string | undefined) ?? copy.retry })
      }
    } catch {
      setResult({ ok: false, title: copy.genericError, detail: copy.connectError })
    } finally {
      setPhase("idle")
    }
  }, [copy, info, locale])

  const handlePress = useCallback((action: "checkin" | "checkout") => {
    if (!navigator.geolocation) {
      setResult({ ok: false, title: copy.noGps, detail: copy.noGpsDetail })
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
  }, [copy.noGps, copy.noGpsDetail, doSubmit])

  // ── Derived ────────────────────────────────────────────────────────────
  const hasLocation = info?.latitude && info?.longitude
  const distanceM = hasLocation && userPos
    ? haversineM(info.latitude!, info.longitude!, userPos.lat, userPos.lng)
    : undefined

  const isOutside = info?.geofenceEnabled && distanceM !== undefined && distanceM > info.geofenceRadiusM
  // Open session = checked in, not yet checked out (pure session model).
  const hasOpenSession = !!info?.checkInAt && !info?.checkOutAt
  const hasCheckedIn = !!info?.checkInAt
  const hasCheckedOut = !!info?.checkOutAt
  const isIdle = phase === "idle"

  // After check-out, allow re-check-in immediately.
  const checkinDisabled = hasOpenSession || !!isOutside || !isIdle || !!result
  const checkoutDisabled = !hasOpenSession || !!isOutside || !isIdle || !!result

  const checkinLabel =
    phase === "locating_in" ? copy.locating :
    phase === "submitting_in" ? copy.submitting :
    copy.checkInButton

  const checkoutLabel =
    phase === "locating_out" ? copy.locating :
    phase === "submitting_out" ? copy.submitting :
    copy.checkOutButton

  const mapsUrl = hasLocation
    ? `https://maps.google.com/?q=${info!.latitude},${info!.longitude}`
    : null

  if (needsLogin) {
    return <LiffLoginPrompt titleKey="liff.checkin.pageTitle" locale={locale} />
  }

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
        <p className="text-base font-bold text-gray-900">{copy.title}</p>
        <div className="relative px-1">
          <span className="text-xl text-gray-500">🔔</span>
          <span className="absolute right-1 top-0 h-2 w-2 rounded-full border border-white bg-[#E80012]" />
        </div>
      </div>

      <div className="border-b border-gray-100 bg-white px-4 py-3">
        <div className="mb-2 text-xs font-medium text-gray-500">{tx("lang.label")}</div>
        <LiffLanguageSwitcher />
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
                {copy.retry}
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
              {info ? copy.noBranchLocation : copy.loadingMap}
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
                  {copy.officeCoords}: {info!.latitude!.toFixed(4)}, {info!.longitude!.toFixed(4)}
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
                🗺 {copy.viewMap}
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
                <p className="text-sm font-bold text-gray-500">{copy.gpsLoading}</p>
                <p className="mt-0.5 text-xs text-gray-400">{copy.gpsLoadingDesc}</p>
              </div>
            </div>
          ) : isOutside ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#E80012] text-lg text-white font-bold">
                ✕
              </div>
              <div>
                <p className="text-sm font-bold text-[#E80012]">{copy.outsideTitle}</p>
                <p className="mt-0.5 text-xs text-red-500">
                  {copy.outsideDetail(Math.round(distanceM!))} ({info!.geofenceRadiusM}m)
                </p>
              </div>
            </div>
          ) : hasOpenSession ? (
            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-lg text-white font-bold">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-green-700">
                  {copy.checkedInAt(info?.checkInAt ? fmtShortTime(info.checkInAt, locale) : "–")}
                </p>
                <p className="mt-0.5 text-xs text-green-600">{copy.checkOutButton}</p>
              </div>
            </div>
          ) : hasCheckedOut ? (
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-400 text-lg text-white font-bold">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-gray-600">
                  {copy.checkedOutAt(info?.checkOutAt ? fmtShortTime(info.checkOutAt, locale) : "–")}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{copy.checkInButton}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-lg text-white font-bold">
                ✓
              </div>
              <div>
                <p className="text-sm font-bold text-green-700">{copy.inRange}</p>
                <p className="mt-0.5 text-xs text-green-600">
                  {copy.inRangeDetail(
                    distanceM !== undefined ? Math.round(distanceM) : undefined
                  )}
                </p>
              </div>
            </div>
          )
        )}

        {/* ── GPS accuracy + Signal strength ── */}
        {userPos && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-400">{copy.gpsAccuracy}</p>
              <p className="mt-1 text-sm font-bold text-gray-900">⊙ ±{Math.round(userPos.accuracyM)} m</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-400">{copy.signalStatus}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <SignalBars accuracyM={userPos.accuracyM} />
                <p className="text-sm font-bold text-gray-900">{signalLabel(userPos.accuracyM, locale)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Shift / session info ── */}
        {info?.shift ? (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5">
              <p className="text-xs font-medium text-gray-400">{copy.shiftTitle}</p>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-[#E80012]">
                {info.shift.name}
              </span>
            </div>
            <div className="flex">
              <div className="flex-1 px-4 py-2.5 text-center">
                <p className="text-xs text-gray-400">{copy.checkInLabel}</p>
                <p className={`mt-0.5 text-sm font-bold ${hasCheckedIn ? "text-green-600" : "text-gray-300"}`}>
                  {info.checkInAt ? fmtShortTime(info.checkInAt, locale) : info.shift.label.split("–")[0]?.trim() ?? "–"}
                </p>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 px-4 py-2.5 text-center">
                <p className="text-xs text-gray-400">{copy.checkOutLabel}</p>
                <p className={`mt-0.5 text-sm font-bold ${hasCheckedOut ? "text-[#E80012]" : "text-gray-300"}`}>
                  {info.checkOutAt ? fmtShortTime(info.checkOutAt, locale) : info.shift.label.split("–")[1]?.trim() ?? "–"}
                </p>
              </div>
            </div>
          </div>
        ) : (hasCheckedIn || hasCheckedOut) ? (
          <div className="flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex-1 px-4 py-3 text-center">
              <p className="text-xs text-gray-400">{copy.checkInLabel}</p>
              <p className={`mt-0.5 text-sm font-bold ${hasCheckedIn ? "text-green-600" : "text-gray-300"}`}>
                {info?.checkInAt ? fmtShortTime(info.checkInAt, locale) : "–"}
              </p>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="flex-1 px-4 py-3 text-center">
              <p className="text-xs text-gray-400">{copy.checkOutLabel}</p>
              <p className={`mt-0.5 text-sm font-bold ${hasCheckedOut ? "text-[#E80012]" : "text-gray-300"}`}>
                {info?.checkOutAt ? fmtShortTime(info.checkOutAt, locale) : "–"}
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Date/time card ── */}
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <span className="text-xl">📅</span>
          <p className="text-sm font-semibold text-gray-900">
            {fmtDate(now, locale)} {copy.dateTimePrefix} {fmtTime(now, locale)}
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

        <p className="text-center text-xs text-gray-400">{copy.autoTrack}</p>
      </div>

      <LiffBottomNav />
    </div>
  )
}
