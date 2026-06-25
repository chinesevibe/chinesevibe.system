import Link from "next/link"
import { redirect } from "next/navigation"

import { LiffBottomNav } from "@/components/liff/LiffBottomNav"
import { LiffLanguageSwitcher } from "@/components/liff/LiffLanguageSwitcher"
import {
  autoCloseOpenAttendanceSessions,
  isCheckoutStillInActiveCycle,
  sessionCycleStartUtc,
} from "@/lib/attendance/session-cycle"
import { getCurrentEmployee } from "@/lib/auth/session"
import { normalizeTimeToHHMM } from "@/lib/datetime/time-input"
import { t } from "@/lib/i18n/translate"
import { liffHref } from "@/lib/i18n/liff-url"
import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { coerceLocale } from "@/lib/i18n/types"
import { createClient } from "@/lib/supabase/server"

export default async function LiffHomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const { lang } = await searchParams
  const employee = await getCurrentEmployee()
  const locale = coerceLocale(lang ?? employee?.preferred_locale)
  if (!employee) {
    const params = new URLSearchParams({
      lang: locale,
      next: `/liff/home?lang=${locale}`,
    })
    redirect(`/login?${params.toString()}`)
  }

  const liff = (path: string) => liffHref(path, locale)
  const tx = (key: Parameters<typeof t>[0], vars?: Parameters<typeof t>[2]) =>
    t(key, locale, vars)

  const supabase = await createClient()

  // ดึง branch + profile schedule ของพนักงาน
  const { data: empDetail } = await supabase
    .from("hr_employees")
    .select(`
      branch_id,
      default_check_in_time,
      default_check_out_time,
      branch:hr_branches(name)
    `)
    .eq("id", employee.id)
    .maybeSingle()

  const branchRaw = empDetail?.branch as unknown as { name: string } | { name: string }[] | null
  const branch = Array.isArray(branchRaw) ? (branchRaw[0]?.name ?? null) : (branchRaw?.name ?? null)

  const defaultCheckInTime = normalizeTimeToHHMM(
    (empDetail?.default_check_in_time as string | null) ?? null
  )
  const defaultCheckOutTime = normalizeTimeToHHMM(
    (empDetail?.default_check_out_time as string | null) ?? null
  )

  const shiftLabel =
    defaultCheckInTime && defaultCheckOutTime
      ? `${defaultCheckInTime} – ${defaultCheckOutTime}`
      : null

  const isNightShift =
    Boolean(defaultCheckInTime && defaultCheckOutTime) &&
    defaultCheckOutTime <= defaultCheckInTime

  const now = new Date()
  await autoCloseOpenAttendanceSessions({ employeeId: employee.id, now })
  const cycleStart = sessionCycleStartUtc(now)

  const { data: attendance } = await supabase
    .from("hr_attendance")
    .select("check_in_at, check_out_at")
    .eq("employee_id", employee.id)
    .gte("check_in_at", cycleStart.toISOString())
    .lte("check_in_at", now.toISOString())
    .order("check_in_at", { ascending: false })
    .maybeSingle()

  // ใช้ locale ของพนักงานในการ format เวลา
  const timeLocale = locale === "th" ? "th-TH" : locale === "zh" ? "zh-TW" : "en-GB"

  const checkoutStillBlocks =
    attendance?.check_out_at
      ? isCheckoutStillInActiveCycle(new Date(attendance.check_out_at), now)
      : true

  const checkInTime = attendance?.check_in_at && checkoutStillBlocks
    ? new Date(attendance.check_in_at).toLocaleTimeString(timeLocale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      })
    : null

  const checkOutTime = attendance?.check_out_at && checkoutStillBlocks
    ? new Date(attendance.check_out_at).toLocaleTimeString(timeLocale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Bangkok",
      })
    : null

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
    { href: liff("/liff/leave"),     icon: "📋", label: tx("portal.home.shortcutLeave"),     sub: tx("liff.home.leaveDesc"),     bg: "bg-red-50"    },
    { href: liff("/liff/overtime"),  icon: "⌚", label: tx("portal.home.shortcutOt"),        sub: tx("liff.home.otDesc"),         bg: "bg-orange-50" },
    { href: liff("/liff/documents"), icon: "📄", label: tx("portal.home.shortcutDoc"),       sub: tx("liff.home.docDesc"),        bg: "bg-blue-50"   },
    { href: liff("/liff/complaint"), icon: "📢", label: tx("portal.home.shortcutComplaint"), sub: tx("liff.home.complaintDesc"),  bg: "bg-green-50"  },
  ]

  if (canAccessPortalInventoryWorkspace(employee)) {
    MENU.push(
      { href: liff("/portal/inventory"), icon: "📦", label: tx("portal.home.shortcutStock"), sub: tx("liff.home.stockDesc"), bg: "bg-emerald-50" },
      { href: liff("/liff/inbound-scan"), icon: "🔍", label: tx("portal.home.shortcutInbound"), sub: tx("liff.home.inboundDesc"), bg: "bg-red-50" }
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      {/* Red header */}
      <div className="bg-[#E80012] px-4 pb-5 pt-10 text-white">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div />
          <LiffLanguageSwitcher />
        </div>
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
        {shiftLabel && (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-400">{tx("liff.home.todayShift")}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <div>
                <p className="text-2xl font-medium text-gray-900">{shiftLabel}</p>
                {isNightShift && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {tx("liff.home.nextDayClock", { time: defaultCheckOutTime })}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-[#E80012]">
                Profile Time
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
            <Link href={liff("/liff/clock")}>
              <span className="mt-3 block w-full rounded-2xl bg-[#E80012] py-4 text-center text-sm font-semibold text-white active:opacity-90">
                {!checkInTime
                  ? tx("liff.home.clockInBtn")
                  : !checkOutTime
                    ? tx("liff.home.clockOutBtn")
                    : tx("liff.home.allDoneBtn")}
              </span>
            </Link>
          </div>
        )}

        {/* Menu grid */}
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
          {tx("liff.home.menuSection")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MENU.map(({ href, icon, label, sub, bg }) => (
            <Link
              key={href}
              href={href}
              className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50"
            >
              <div className="flex flex-col gap-2">
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
        <Link
          href={liff("/liff/approvals")}
          className="block rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm active:bg-gray-50"
        >
          <div className="flex items-center justify-between">
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
