"use client"

import Link from "next/link"
import { X } from "lucide-react"

import { useAdminContextTabs } from "@/components/admin/AdminContextTabsProvider"
import { cn } from "@/lib/utils"

export function AdminContextTabs() {
  const { activeId, tabs, closeTab } = useAdminContextTabs()

  if (tabs.length === 0) return null

  return (
    <div className="border-t border-border/60 px-1 pt-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border/80">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              "group flex shrink-0 items-center rounded-t-2xl rounded-b-lg border px-3 py-2 shadow-sm transition-colors",
              activeId === tab.id
                ? "border-brand-red/15 bg-brand-red text-white"
                : "border-border/80 bg-background text-foreground/80 hover:border-brand-red/20 hover:bg-brand-red/5"
            )}
          >
            <Link
              href={tab.href}
              className="max-w-[12rem] truncate text-sm font-medium"
            >
              {tab.label}
            </Link>
            {tab.closable ? (
              <button
                type="button"
                onClick={() => closeTab(tab.id)}
                className={cn(
                  "ml-2 inline-flex size-5 items-center justify-center rounded-full transition-colors",
                  activeId === tab.id
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-label={`ปิดแท็บ ${tab.label}`}
                title={`ปิดแท็บ ${tab.label}`}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
