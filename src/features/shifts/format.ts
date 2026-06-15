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

/** e.g. "Office (9h)" */
export function formatShiftLabel(shift: WorkShiftSummary): string {
  return `${shift.name} (${shift.standard_hours}h)`
}
