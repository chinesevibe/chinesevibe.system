import { BriefcaseBusiness, Clock3, MoonStar, UserRound } from "lucide-react"

type EmployeeAttendanceHeaderProps = {
  employeeName: string
  employeeCode: string
  department: string | null
  position: string | null
  shiftDetail: string
  isOvernightShift: boolean
}

export function EmployeeAttendanceHeader({
  employeeName,
  employeeCode,
  department,
  position,
  shiftDetail,
  isOvernightShift,
}: EmployeeAttendanceHeaderProps) {
  return (
    <section className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            <span>ข้อมูลพนักงาน</span>
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-lg font-semibold text-foreground">{employeeName}</h2>
            <p className="break-words text-sm text-muted-foreground">
              รหัส {employeeCode}
              {department ? ` • ${department}` : ""}
            </p>
          </div>
        </div>
        {isOvernightShift ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
            <MoonStar className="h-3.5 w-3.5" />
            กะข้ามวัน
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-background/80 p-2.5">
          <p className="text-xs text-muted-foreground">แผนก</p>
          <p className="mt-1 text-sm font-medium text-foreground">{department || "ไม่ระบุ"}</p>
        </div>
        {position ? (
          <div className="rounded-lg border border-border/60 bg-background/80 p-2.5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              ตำแหน่ง
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{position}</p>
          </div>
        ) : null}
        {shiftDetail ? (
          <div className="rounded-lg border border-border/60 bg-background/80 p-2.5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              กะงาน
            </p>
            <p className="mt-1 break-words text-sm font-medium text-foreground">{shiftDetail}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
