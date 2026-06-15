"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

export function BrandTabs({
  tabs,
  active,
  param = "tab",
  preserveParams = [],
}: {
  tabs: Array<{ id: string; label: string }>
  active: string
  param?: string
  preserveParams?: string[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <div className="flex flex-wrap gap-2 border-b border-border/60 pb-4">
      {tabs.map((tab) => {
        const params = new URLSearchParams()
        for (const key of preserveParams) {
          const value = searchParams.get(key)
          if (value) params.set(key, value)
        }
        params.set(param, tab.id)
        return (
          <Link
            key={tab.id}
            href={`${pathname}?${params.toString()}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active === tab.id
                ? "bg-brand-red text-white shadow-sm"
                : "border border-border/80 bg-background text-foreground/80 hover:border-brand-red/30 hover:bg-brand-red/5"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
