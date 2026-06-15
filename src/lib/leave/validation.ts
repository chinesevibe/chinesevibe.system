import { ictToday } from "@/features/employees/data"

const DAY_MS = 86_400_000

export function validateRetroactiveSickLeave(startDate: string): string | null {
  const today = ictToday()
  if (startDate >= today) return null

  const start = Date.parse(`${startDate}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  const daysBack = Math.round((now - start) / DAY_MS)
  if (daysBack > 3) {
    return "ลาป่วยย้อนหลังได้ไม่เกิน 3 วัน"
  }
  return null
}

export function requiresMedicalCertificate(
  type: string,
  startDate: string,
  leaveUnit: "days" | "hours"
): boolean {
  if (type !== "sick") return false
  if (leaveUnit === "hours") return true
  const today = ictToday()
  return startDate < today
}
