import type { AttendanceRow } from "@/features/attendance/types"

export function rowsToCsv(rows: AttendanceRow[]): string {
  const header = [
    "วันที่",
    "พนักงาน",
    "แผนก",
    "เวลาเข้า",
    "เวลาออก",
    "ชั่วโมง",
    "สถานะ",
  ]
  const lines = rows.map((r) =>
    [
      r.date,
      r.employeeName,
      r.department ?? "",
      r.checkInText,
      r.checkOutText,
      r.workHours?.toString() ?? "",
      r.statusLabel,
    ]
      .map((v) => `"${v.replace(/"/g, '""')}"`)
      .join(",")
  )
  return [header.join(","), ...lines].join("\n")
}
