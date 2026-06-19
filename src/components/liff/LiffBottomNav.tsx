"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useLocale } from "@/features/portal/LocaleProvider"
import { liffHref } from "@/lib/i18n/liff-url"

export function LiffBottomNav() {
  const pathname = usePathname()
  const { tx, locale } = useLocale()

  const NAV_ITEMS = [
    { path: "/liff/home", icon: "🏠", label: tx("portal.nav.home") },
    { path: "/liff/attendance", icon: "⏰", label: tx("portal.nav.attendance") },
    { path: "/liff/leave", icon: "📋", label: tx("liff.nav.leaveOt") },
    { path: "/liff/documents", icon: "📄", label: tx("portal.nav.documents") },
  ]

  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-gray-100 bg-white">
      {NAV_ITEMS.map(({ path, icon, label }) => {
        const href = liffHref(path, locale)
        const isActive =
          path === "/liff/home" ? pathname === path : pathname.startsWith(path)

        return (
          <Link
            key={path}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
              isActive ? "text-[#E80012]" : "text-gray-400"
            }`}
          >
            <span className="text-xl leading-none">{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
