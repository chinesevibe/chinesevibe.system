"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Layers } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DEV_VIEW_OPTIONS,
  type DevViewAs,
  devViewLabel,
} from "@/lib/auth/dev-view"

export function DevRoleSwitcher({ currentView }: { currentView: DevViewAs }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  async function selectView(view: DevViewAs) {
    setOpen(false)
    const res = await fetch("/api/dev/view-as", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ view }),
    })
    if (!res.ok) return

    startTransition(() => {
      router.refresh()
      if (view === "ceo") router.push("/admin/report")
      else if (view === "branch") router.push("/admin/branch")
      else router.push("/admin")
    })
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="สลับมุมมอง Dev"
      >
        <Layers className="size-4" />
        <span className="hidden sm:inline">{devViewLabel(currentView)}</span>
      </Button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-border/80 bg-white py-1 shadow-lg"
          >
            {DEV_VIEW_OPTIONS.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={currentView === option.id}
                  className={cn(
                    "flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted",
                    currentView === option.id && "bg-violet-50 text-violet-900"
                  )}
                  onClick={() => selectView(option.id)}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
