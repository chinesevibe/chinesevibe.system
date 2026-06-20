import {
  formatShiftDurationHours,
  formatShiftLabel,
  formatShiftTimeRange,
} from "@/features/shifts/format"
import { suggestWorkShiftCode } from "@/features/shifts/defaults"
import type { WorkShiftSummary } from "@/features/shifts/types"

export function shiftIdForCode(
  shifts: WorkShiftSummary[],
  code: string
): string {
  return shifts.find((shift) => shift.code === code)?.id ?? ""
}

export function suggestShiftId(
  shifts: WorkShiftSummary[],
  input: {
    role: string
    department: string | null | undefined
    branchId: string | null | undefined
  }
): string {
  const code = suggestWorkShiftCode(input)
  return shiftIdForCode(shifts, code)
}

export function workShiftOptionLabel(shift: WorkShiftSummary): string {
  return `${shift.name} · ${formatShiftTimeRange(shift)} · ${formatShiftDurationHours(shift)}h`
}

export function findWorkShift(
  shifts: WorkShiftSummary[],
  id: string | null | undefined
): WorkShiftSummary | undefined {
  if (!id) return undefined
  return shifts.find((shift) => shift.id === id)
}

export function workShiftDisplayLabel(
  shifts: WorkShiftSummary[],
  id: string | null | undefined
): string {
  const shift = findWorkShift(shifts, id)
  if (!shift) return "— ยังไม่กำหนด —"
  return formatShiftLabel(shift)
}
