import { getCurrentEmployee } from "@/lib/auth/session"
import { AttendanceManualClient } from "./page-client"

function ictDateNow(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function ictTimeNow(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  }).format(new Date())
}

export default async function AttendanceLiffPage() {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  return (
    <AttendanceManualClient
      defaultDate={ictDateNow()}
      defaultTime={ictTimeNow()}
    />
  )
}
