import { AlertTriangle, ScanSearch } from "lucide-react"

import type { AttendanceRow } from "@/features/attendance/types"

type DiagnosisSummary = {
  late: number
  open: number
  pendingReview: number
  overnight: number
}

type EmployeeAttendanceDiagnosisPanelProps = {
  selectedDateLabel: string
  shiftDetail: string
  selectedTotal: number
  selectedSummary: DiagnosisSummary
  selectedDateSourceLimited: boolean
  selectedFlags: string[]
  selectedRows: AttendanceRow[]
  fallbackShiftName: string | null
  fallbackShiftTime: string | null
}

function formatWorkHours(hours: number | null): string {
  if (hours == null) return "—"
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace(/\.?0+$/, "")} ชม.`
}

export function EmployeeAttendanceDiagnosisPanel({
  selectedDateLabel,
  shiftDetail,
  selectedTotal,
  selectedSummary,
  selectedDateSourceLimited,
  selectedFlags,
  selectedRows,
  fallbackShiftName,
  fallbackShiftTime,
}: EmployeeAttendanceDiagnosisPanelProps) {
  return (
    <section className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ScanSearch className="h-3.5 w-3.5" />
            <span>สรุปวันที่เลือก</span>
          </div>
          <h3 className="mt-1 break-words text-base font-semibold text-foreground">
            {selectedDateLabel}
          </h3>
          <div className="mt-1 space-y-1 text-sm text-muted-foreground">
            <p>
              {selectedTotal > 0
                ? `พบ ${selectedTotal} รายการของวันที่เลือก`
                : "ไม่พบบันทึกเวลาในวันที่เลือก"}
            </p>
            <p className="break-words">กะอ้างอิง: {shiftDetail || "ไม่มีข้อมูลกะงาน"}</p>
          </div>
        </div>
        {selectedFlags.length > 0 ? (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            ต้องตรวจสอบ {selectedFlags.length} ประเด็น
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">มาสาย</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{selectedSummary.late}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">ยังไม่เช็คออก</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{selectedSummary.open}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">รอตรวจพิกัด</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {selectedSummary.pendingReview}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">กะข้ามวัน</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{selectedSummary.overnight}</p>
        </div>
      </div>
      {selectedDateSourceLimited ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
          แสดงรายละเอียด 20 รายการแรกของวันที่เลือก หากวันเดียวมีมากกว่านี้ให้ไล่ตรวจต่อในตารางด้านล่าง
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {selectedFlags.length > 0 ? (
          selectedFlags.map((flag) => (
            <span
              key={flag}
              className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700"
            >
              {flag}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
            ไม่มีสัญญาณผิดปกติจากผลลัพธ์ที่เลือก
          </span>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {selectedRows.length > 0 ? (
          selectedRows.map((row, index) => {
            const correctionNeeds = [
              row.status === "late" ? "ตรวจเหตุผลมาสาย" : null,
              !row.checkOutAt ? "ติดตามหรือแก้ไขเวลาออก" : null,
              row.locationReviewStatus === "pending_hr" ? "รอ HR ตรวจพิกัด" : null,
              row.locationReviewStatus === "rejected" ? "ตรวจพิกัดที่ถูกปฏิเสธ" : null,
              row.shiftCrossesMidnight ? "ตรวจรอบกะข้ามวัน" : null,
            ].filter(Boolean) as string[]

            return (
              <div key={row.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">รายการ {index + 1}</p>
                    <p className="break-words text-xs text-muted-foreground">
                      {row.shiftName || fallbackShiftName || "ไม่ระบุกะ"}{" "}
                      {row.shiftTimeText
                        ? `• ${row.shiftTimeText}`
                        : fallbackShiftTime
                          ? `• ${fallbackShiftTime}`
                          : ""}
                      {row.shiftCrossesMidnight ? " • ข้ามวัน" : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                    {row.statusLabel}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">เช็คเข้า</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{row.checkInText}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">เช็คออก</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{row.checkOutText}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">ชั่วโมงทำงาน</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {formatWorkHours(row.workHours)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                    <p className="text-xs text-muted-foreground">ตรวจพิกัด</p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {row.locationReviewLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                  <p>ขาดเช็คเข้า: ไม่มี</p>
                  <p>ขาดเช็คออก: {row.checkOutAt ? "ไม่มี" : "มี"}</p>
                  <p>มาสาย: {row.status === "late" ? "ใช่" : "ไม่"}</p>
                  <p>เลิกก่อนเวลา: ไม่มีข้อมูล</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {correctionNeeds.length > 0 ? (
                    correctionNeeds.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700"
                      >
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      ไม่มี action ด่วน
                    </span>
                  )}
                </div>
                {row.locationReviewNote ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    หมายเหตุพิกัด: {row.locationReviewNote}
                  </p>
                ) : null}
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            ไม่พบบันทึกเวลาในวันที่เลือก ให้ตรวจวันหยุด, การขาดงาน, หรือใช้ปุ่มแก้ไข/เพิ่มข้อมูลตามสิทธิ์
          </div>
        )}
      </div>
    </section>
  )
}
