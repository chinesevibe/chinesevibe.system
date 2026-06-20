import { formatShiftDurationHours, formatShiftTimeRange } from "@/features/shifts/format"
import type { WorkShiftSummary } from "@/features/shifts/types"
import { cn } from "@/lib/utils"

export function WorkShiftField({
  shifts,
  value,
  onChange,
  disabled,
  inputClassName,
  hint,
}: {
  shifts: WorkShiftSummary[]
  value: string
  onChange: (shiftId: string) => void
  disabled?: boolean
  inputClassName: string
  hint?: string
}) {
  const selected = shifts.find((shift) => shift.id === value)
  const toOptionLabel = (shift: WorkShiftSummary): string => {
    const range = formatShiftTimeRange(shift)
    const name = shift.name.includes(range) ? shift.name : `${shift.name} (${range})`
    return `${name} (${formatShiftDurationHours(shift)}h)`
  }

  return (
    <div className="space-y-1">
      <select
        className={inputClassName}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— ยังไม่กำหนด (ใช้เวลา Settings fallback) —</option>
        {shifts.map((shift) => (
          <option key={shift.id} value={shift.id}>
            {toOptionLabel(shift)}
          </option>
        ))}
        {value && !selected ? (
          <option value={value}>กะเดิม (ไม่พบในรายการ)</option>
        ) : null}
      </select>
      {hint ? (
        <p className={cn("text-xs text-muted-foreground")}>{hint}</p>
      ) : null}
    </div>
  )
}
