import type { AttendanceRow } from "@/features/attendance/types"

export function rowsToCsv(rows: AttendanceRow[]): string {
  const header = [
    "วันที่",
    "พนักงาน",
    "สาขา",
    "แผนก",
    "เวลาเข้า",
    "เวลาออก",
    "ชั่วโมง",
    "OT นาที",
    "OT ชั่วโมง",
    "สถานะ",
  ]
  const lines = rows.map((r) =>
    [
      r.date,
      r.employeeName,
      r.branchName ?? "",
      r.department ?? "",
      r.checkInText,
      r.checkOutText,
      r.workHours?.toString() ?? "",
      r.overtimeMinutes > 0 ? String(r.overtimeMinutes) : "",
      r.overtimeHours > 0 ? r.overtimeHours.toFixed(1) : "",
      r.statusLabel,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  )
  return [header.join(","), ...lines].join("\n")
}
