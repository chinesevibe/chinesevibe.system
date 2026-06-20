import { formatShiftDurationHours, formatShiftTimeRange } from "@/features/shifts/format"
import type { WorkShiftSummary } from "@/features/shifts/types"

export function WorkShiftsPanel({ shifts }: { shifts: WorkShiftSummary[] }) {
  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-1 text-sm font-semibold">กะทำงาน (Work Shifts)</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        HR กำหนดกะต่อคนในโปรไฟล์พนักงาน — ถ้าไม่ระบุ ระบบใช้เวลาเริ่มงานจาก Settings
      </p>
      {shifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีกะในระบบ</p>
      ) : (
        <ul className="divide-y divide-border/60 text-sm">
          {shifts.map((shift) => (
            <li key={shift.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <div>
                <p className="font-medium">{shift.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{shift.code}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{formatShiftTimeRange(shift)} ICT</p>
                <p>
                  {formatShiftDurationHours(shift)}h · grace {shift.grace_minutes}m
                  {shift.crosses_midnight ? " · ข้ามวัน" : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
