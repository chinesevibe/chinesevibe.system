"use client"

import Link from "next/link"

import { useLocale } from "@/features/portal/LocaleProvider"
import { liffHref } from "@/lib/i18n/liff-url"

interface LiffPageShellProps {
  /** ชื่อหน้า แสดงใน red header */
  title: string
  /** subtext ใต้ title (เช่น วันลาคงเหลือ) */
  subtitle?: string
  /** ลิงก์ปุ่ม ย้อนกลับ — default: /liff/home */
  backHref?: string
  /** ไม่แสดงปุ่ม ย้อนกลับ (หน้า home) */
  hideBack?: boolean
  children: React.ReactNode
}

export function LiffPageShell({
  title,
  subtitle,
  backHref = "/liff/home",
  hideBack = false,
  children,
}: LiffPageShellProps) {
  const { tx, locale } = useLocale()
  const href = liffHref(backHref, locale)

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5]">
      {/* Red header */}
      <div className="bg-[#E80012] px-4 pb-4 pt-3 text-white">
        {!hideBack && (
          <Link
            href={href}
            className="mb-2 inline-flex items-center gap-1 text-sm text-white/80 active:text-white"
          >
            {tx("liff.nav.back")}
          </Link>
        )}
        <h1 className="text-lg font-medium leading-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-white/75">{subtitle}</p>
        )}
      </div>

      {/* Page content */}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}
