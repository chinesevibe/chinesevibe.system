"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function AdminEmployeeSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  function submitSearch() {
    const q = query.trim()
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    const suffix = params.toString()
    router.push(suffix ? `/admin/employees?${suffix}` : "/admin/employees")
  }

  return (
    <div className="relative mx-auto hidden w-full max-w-xl flex-1 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            submitSearch()
          }
        }}
        placeholder="ค้นหาพนักงาน (ชื่อ)..."
        className="h-9 w-full rounded-full border border-border/80 bg-muted/30 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"
        aria-label="ค้นหาพนักงาน"
      />
    </div>
  )
}
