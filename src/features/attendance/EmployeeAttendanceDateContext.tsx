import { CalendarDays } from "lucide-react"

type EmployeeAttendanceDateContextProps = {
  monthLabel: string
  selectedDateLabel: string
  from: string
  to: string
  page: number
  total: number
}

export function EmployeeAttendanceDateContext({
  monthLabel,
  selectedDateLabel,
  from,
  to,
  page,
  total,
}: EmployeeAttendanceDateContextProps) {
  return (
    <section className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>บริบทวันที่</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-background/80 p-2.5">
          <p className="text-xs text-muted-foreground">เดือนที่เลือก</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">{monthLabel}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/80 p-2.5">
          <p className="text-xs text-muted-foreground">วันที่โฟกัส</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">{selectedDateLabel}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/80 p-2.5">
          <p className="text-xs text-muted-foreground">ช่วงข้อมูลที่แสดง</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">
            {from} ถึง {to}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/80 p-2.5">
          <p className="text-xs text-muted-foreground">หน้ารายการ</p>
          <p className="mt-1 break-words text-sm font-medium text-foreground">
            หน้า {page} • {total} รายการ
          </p>
        </div>
      </div>
    </section>
  )
}
