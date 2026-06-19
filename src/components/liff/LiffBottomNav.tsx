"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useLocale } from "@/features/portal/LocaleProvider"

export function LiffBottomNav() {
  const pathname = usePathname()
  const { tx } = useLocale()

  const NAV_ITEMS = [
    { href: "/liff/home",       icon: "🏠", label: tx("portal.nav.home") },
    { href: "/liff/attendance", icon: "⏰", label: tx("portal.nav.attendance") },
    { href: "/liff/leave",      icon: "📋", label: tx("liff.nav.leaveOt") },
    { href: "/liff/documents",  icon: "📄", label: tx("portal.nav.documents") },
  ]

  return (
    <nav className="sticky bottom-0 z-10 flex border-t border-gray-100 bg-white">
      {NAV_ITEMS.map(({ href, icon, label }) => {
        const isActive =
          href === "/liff/home"
            ? pathname === "/liff/home"
            : pathname.startsWith(href)

        return (
          <Link
            key={href}
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
