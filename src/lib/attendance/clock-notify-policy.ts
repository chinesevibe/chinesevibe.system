import type { AttendanceLocationInput } from "@/lib/attendance/location-security"

export function shouldPushClockReceipt(
  source: AttendanceLocationInput["source"]
): boolean {
  return source !== "line_location_message"
}
