"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

const inputClassName =
  "h-9 rounded-lg border border-border/80 bg-muted/30 px-3 text-sm outline-none focus-visible:border-brand-red/40 focus-visible:ring-2 focus-visible:ring-brand-red/20"

export function AttendanceFilters({
  departments,
  employees,
  values,
}: {
  departments: string[]
  employees: Array<{ id: string; name: string }>
  values: {
    from: string
    to: string
    dept: string
    employee: string
  }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm">
        จากวันที่
        <input
          type="date"
          className={inputClassName}
          value={values.from}
          onChange={(e) => update("from", e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        ถึงวันที่
        <input
          type="date"
          className={inputClassName}
          value={values.to}
          onChange={(e) => update("to", e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        แผนก
        <select
          className={inputClassName}
          value={values.dept}
          onChange={(e) => update("dept", e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        พนักงาน
        <select
          className={inputClassName}
          value={values.employee}
          onChange={(e) => update("employee", e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
