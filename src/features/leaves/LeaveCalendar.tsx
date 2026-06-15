import Link from "next/link"

import {
  buildCalendarGrid,
  type CalendarLeave,
} from "@/features/leaves/insights"

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"]

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export function LeaveCalendar({
  month,
  entries,
}: {
  month: string
  entries: CalendarLeave[]
}) {
  const grid = buildCalendarGrid(month)
  const byDate = new Map<string, CalendarLeave[]>()
  for (const e of entries) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }

  const [y, m] = month.split("-")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link
          href={`?view=calendar&month=${shiftMonth(month, -1)}`}
          className="text-sm text-primary underline"
        >
          ← เดือนก่อน
        </Link>
        <h3 className="text-sm font-semibold">
          {m}/{y}
        </h3>
        <Link
          href={`?view=calendar&month=${shiftMonth(month, 1)}`}
          className="text-sm text-primary underline"
        >
          เดือนถัดไป →
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => (
          <div
            key={i}
            className="min-h-[72px] rounded-md border border-border/60 p-1 text-left"
          >
            {cell.day ? (
              <>
                <span className="text-xs font-medium">{cell.day}</span>
                <ul className="mt-1 space-y-0.5">
                  {(byDate.get(cell.date!) ?? []).slice(0, 2).map((e, idx) => (
                    <li
                      key={`${e.employeeName}-${idx}`}
                      className="truncate rounded bg-primary/10 px-1 text-[10px]"
                      title={`${e.employeeName} — ${e.typeLabel}`}
                    >
                      {e.employeeName}
                    </li>
                  ))}
                  {(byDate.get(cell.date!)?.length ?? 0) > 2 ? (
                    <li className="text-[10px] text-muted-foreground">
                      +{(byDate.get(cell.date!)!.length - 2)} คน
                    </li>
                  ) : null}
                </ul>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
