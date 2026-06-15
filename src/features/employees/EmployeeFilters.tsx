"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

const inputClass =
  "h-9 rounded-lg border border-border/80 bg-muted/30 px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

export function EmployeeFilters({ departments }: { departments: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get("q") ?? "")
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete("page") // any filter change resets pagination
    router.replace(`${pathname}?${params.toString()}`)
  }

  // Debounced search — pushes 300ms after the user stops typing.
  useEffect(() => {
    if (q === (searchParams.get("q") ?? "")) return
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => push({ q }), 300)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        placeholder="ค้นหาชื่อพนักงาน..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={`${inputClass} w-56`}
        aria-label="ค้นหาชื่อพนักงาน"
      />
      <select
        value={searchParams.get("dept") ?? ""}
        onChange={(e) => push({ dept: e.target.value })}
        className={inputClass}
        aria-label="กรองตามแผนก"
      >
        <option value="">ทุกแผนก</option>
        {departments.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => push({ status: e.target.value })}
        className={inputClass}
        aria-label="กรองตามสถานะ"
      >
        <option value="">ทุกสถานะ</option>
        <option value="active">Active</option>
        <option value="probation">Probation</option>
        <option value="inactive">Inactive</option>
        <option value="onboarding">รออนุมัติ / กำหนดสาขา</option>
      </select>
      <select
        value={`${searchParams.get("sort") ?? "name"}:${searchParams.get("dir") ?? "asc"}`}
        onChange={(e) => {
          const [sort, dir] = e.target.value.split(":")
          push({ sort, dir })
        }}
        className={inputClass}
        aria-label="เรียงลำดับ"
      >
        <option value="name:asc">ชื่อ (ก→ฮ)</option>
        <option value="name:desc">ชื่อ (ฮ→ก)</option>
        <option value="contract_start:asc">วันเริ่มงาน (เก่า→ใหม่)</option>
        <option value="contract_start:desc">วันเริ่มงาน (ใหม่→เก่า)</option>
      </select>
    </div>
  )
}
