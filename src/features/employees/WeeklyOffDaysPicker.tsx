"use client"

import {
  WEEKLY_OFF_DAY_OPTIONS,
  serializeOffDays,
  type WeeklyOffDay,
} from "@/lib/employees/off-days"

export function WeeklyOffDaysPicker({
  value,
  onChange,
  label = "วันหยุดประจำสัปดาห์",
  hint = "ติ๊กวันที่พนักงานหยุดประจำ (เหมือนตั้งค่า Morning Push)",
}: {
  value: WeeklyOffDay[]
  onChange: (next: WeeklyOffDay[]) => void
  label?: string
  hint?: string
}) {
  return (
    <div className="text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">
        {WEEKLY_OFF_DAY_OPTIONS.map((day) => {
          const checked = value.includes(day.value)
          return (
            <label
              key={day.value}
              className="flex min-w-10 items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const nextDays = e.target.checked
                    ? [...value, day.value]
                    : value.filter((valueDay) => valueDay !== day.value)
                  onChange(serializeOffDays(nextDays))
                }}
              />
              <span>{day.label}</span>
            </label>
          )
        })}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
