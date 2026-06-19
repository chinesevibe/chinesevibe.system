import Link from "next/link"
import { redirect } from "next/navigation"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { getCurrentEmployee } from "@/lib/auth/session"
import { t } from "@/lib/i18n/translate"
import { coerceLocale } from "@/lib/i18n/types"
import { createClient } from "@/lib/supabase/server"

// ฟอร์แมตเวลา HH:MM จาก hour + minute
function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// work_date วันนี้ใน ICT — คำนึง crosses_midnight
function todayWorkDate(crossesMidnight: boolean): string {
  const now = new Date(
    new Date().toLocaleString("en-CA", { timeZone: "Asia/Bangkok" })
  )
  const hour = now.getHours()
  if (crossesMidnight && hour < 6) {
    const d = new Date(now)
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  return now.toISOString().slice(0, 10)
}

export default async function LiffHomePage() {
  const employee = await getCurrentEmployee()
  if (!employee) redirect("/login")

  const locale = coerceLocale(employee.preferred_locale)
  const tx = (key: Parameters<typeof t>[0], vars?: Parameters<typeof t>[2]) =>
    t(key, locale, vars)

  const supabase = await createClient()

  // ดึง branch + shift ของพนักงาน
  const { data: empDetail } = await supabase
    .from("hr_employees")
    .select(`
      branch_id,
      branch:hr_branches(name),
      work_shift:hr_work_shifts(
        name, start_hour, start_minute,
        end_hour, end_minute, crosses_midnight
      )
    `)
    .eq("id", employee.id)
    .maybeSingle()

  const branchRaw = empDetail?.branch as unknown as { name: string } | { name: string }[] | null
  const branch = Array.isArray(branchRaw) ? (branchRaw[0]?.name ?? null) : (branchRaw?.name ?? null)

  type ShiftRow = {
    name: string
    start_hour: number
    start_minute: number
    end_hour: number
    end_minute: number
    crosses_midnight: boolean
  }
  const shiftRaw = empDetail?.work_shift as unknown as ShiftRow | ShiftRow[] | null
  const shift: ShiftRow | null = Array.isArray(shiftRaw) ? (shiftRaw[0] ?? null) : (shiftRaw ?? null)

  const workDate = shift
    ? todayWorkDate(shift.crosses_midnight)
    : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })

  const { data: attendance } = await supabase
    .from("hr_attendance")
    .select("check_in_at, check_out_at")
    .eq("employee_id", employee.id)
    .eq("shift_date", workDate)
    .maybeSingle()

  // ใช้ locale ของพนักงานในการ format เวลา
  const timeLocale = locale === "th" ? "th-TH" : locale === "zh" ? "zh-TW" : "en-GB"

  const checkInTime = attendance?.check_in_at
    ? new Date(attendance.check_in_at).toLocaleTimeString(timeLocale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      })
    : null

  const checkOutTime = attendance?.check_out_at
    ? new Date(attendance.check_out_at).toLocaleTimeString(timeLocale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      })
    : null

  const shiftLabel = shift
    ? `${fmtTime(shift.start_hour, shift.start_minute)} – ${fmtTime(shift.end_hour, shift.end_minute)}`
    : null

  const isNightShift = shift?.crosses_midnight ?? false

  const nowHour = parseInt(
    new Date().toLocaleString("en-GB", { hour: "numeric", timeZone: "Asia/Bangkok" })
  )
  const greeting =
    nowHour < 12
      ? tx("liff.home.greetingMorning")
      : nowHour < 17
        ? tx("liff.home.greetingAfternoon")
        : tx("liff.home.greetingEvening")

  const MENU = [
    { href: "/liff/leave",     icon: "📋", label: tx("portal.home.shortcutLeave"),     sub: tx("liff.home.leaveDesc"),     bg: "bg-red-50"    },
    { href: "/liff/overtime",  icon: "⌚", label: tx("portal.home.shortcutOt"),        sub: tx("liff.home.otDesc"),         bg: "bg-orange-50" },
    { href: "/liff/documents", icon: "📄", label: tx("portal.home.shortcutDoc"),       sub: tx("liff.home.docDesc"),        bg: "bg-blue-50"   },
    { href: "/liff/complaint", icon: "📢", label: tx("portal.home.shortcutComplaint"), sub: tx("liff.home.complaintDesc"),  bg: "bg-green-50"  },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      {/* Red header */}
      <div className="bg-[#E80012] px-4 pb-5 pt-10 text-white">
        <p className="text-sm text-white/80">{greeting}</p>
        <h1 className="mt-1 text-xl font-medium">{employee.name}</h1>
        {branch && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs">
            📍 {branch}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {/* Shift card */}
        {shift && (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">{tx("liff.home.todayShift")}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <div>
                <p className="text-2xl font-medium text-gray-900">{shiftLabel}</p>
                {isNightShift && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {tx("liff.home.nextDayClock", { time: fmtTime(shift.end_hour, shift.end_minute) })}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-[#E80012]">
                {shift.name}
              </span>
            </div>

            {/* Attendance status */}
            <div className="mt-3 flex gap-2 border-t border-gray-50 pt-3">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-400">{tx("liff.home.checkInLabel")}</p>
                <p className={`mt-0.5 text-sm font-medium ${checkInTime ? "text-green-600" : "text-gray-300"}`}>
                  {checkInTime ?? "–"}
                </p>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-400">{tx("liff.home.checkOutLabel")}</p>
                <p className={`mt-0.5 text-sm font-medium ${checkOutTime ? "text-[#E80012]" : "text-gray-300"}`}>
                  {checkOutTime ?? "–"}
                </p>
              </div>
            </div>

            {/* Clock-in / out button */}
            <Link href="/liff/checkin">
              <button className="mt-3 w-full rounded-xl bg-[#E80012] py-3 text-sm font-medium text-white active:opacity-90">
                {!checkInTime
                  ? tx("liff.home.clockInBtn")
                  : !checkOutTime
                    ? tx("liff.home.clockOutBtn")
                    : tx("liff.home.allDoneBtn")}
              </button>
            </Link>
          </div>
        )}

        {/* Menu grid */}
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
          {tx("liff.home.menuSection")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MENU.map(({ href, icon, label, sub, bg }) => (
            <Link key={href} href={href}>
              <div className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl ${bg}`}>
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* History link */}
        <Link href="/liff/approvals">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm active:bg-gray-50">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-xl">
                📑
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{tx("liff.home.historyTitle")}</p>
                <p className="text-xs text-gray-400">{tx("liff.home.historyDesc")}</p>
              </div>
            </div>
            <span className="text-gray-300">→</span>
          </div>
        </Link>
      </div>

      <LiffBottomNav />
    </div>
  )
}
