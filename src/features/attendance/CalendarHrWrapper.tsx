"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AttendanceCalendar } from "@/features/attendance/AttendanceCalendar"
import { CalendarDayOffModal } from "@/features/attendance/CalendarDayOffModal"
import type { AttendanceDayCell } from "@/features/attendance/calendar-types"

export function CalendarHrWrapper({
  month,
  days,
  basePath,
  selectedDate,
  monthLinkQuery,
  dayLinkQuery,
  employeeId,
}: {
  month: string
  days: AttendanceDayCell[]
  basePath: string
  selectedDate?: string | null
  monthLinkQuery?: Record<string, string>
  dayLinkQuery?: Record<string, string>
  employeeId: string
}) {
  const router = useRouter()
  const [activeCell, setActiveCell] = useState<AttendanceDayCell | null>(null)

  const handleDayClick = useCallback((cell: AttendanceDayCell) => {
    setActiveCell(cell)
  }, [])

  const handleClose = useCallback(() => {
    setActiveCell(null)
  }, [])

  const handleMutated = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <>
      <AttendanceCalendar
        month={month}
        days={days}
        basePath={basePath}
        selectedDate={selectedDate}
        monthLinkQuery={monthLinkQuery}
        dayLinkQuery={dayLinkQuery}
        onDayClick={handleDayClick}
        hrMode
        compact
      />
      {activeCell ? (
        <CalendarDayOffModal
          cell={activeCell}
          employeeId={employeeId}
          onClose={handleClose}
          onMutated={handleMutated}
        />
      ) : null}
    </>
  )
}
