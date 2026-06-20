import type { WorkShiftSummary } from "@/features/shifts/types"

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/** e.g. "11:00–20:00" */
export function formatShiftTimeRange(
  shift: Pick<
    WorkShiftSummary,
    "start_hour" | "start_minute" | "end_hour" | "end_minute"
  >
): string {
  return `${pad2(shift.start_hour)}:${pad2(shift.start_minute)}–${pad2(shift.end_hour)}:${pad2(shift.end_minute)}`
}

export function computeShiftDurationHours(
  shift: Pick<
    WorkShiftSummary,
    "start_hour" | "start_minute" | "end_hour" | "end_minute" | "crosses_midnight"
  >
): number {
  const startMinutes = shift.start_hour * 60 + shift.start_minute
  const endMinutes = shift.end_hour * 60 + shift.end_minute
  const crossesMidnight = shift.crosses_midnight || endMinutes <= startMinutes
  const durationMinutes = (crossesMidnight ? endMinutes + 24 * 60 : endMinutes) - startMinutes
  return Math.round((durationMinutes / 60) * 100) / 100
}

export function formatShiftDurationHours(
  shift: Pick<
    WorkShiftSummary,
    "start_hour" | "start_minute" | "end_hour" | "end_minute" | "crosses_midnight"
  >
): string {
  const hours = computeShiftDurationHours(shift)
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, "")
}

/** e.g. "Office (9h)" */
export function formatShiftLabel(shift: WorkShiftSummary): string {
  return `${shift.name} (${formatShiftDurationHours(shift)}h)`
}
