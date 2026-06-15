import type { WorkShift, WorkShiftSummary } from "@/features/shifts/types"
import { createClient } from "@/lib/supabase/server"

export { formatShiftLabel, formatShiftTimeRange } from "@/features/shifts/format"

const SUMMARY_COLUMNS =
  "id, code, name, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes, standard_hours, is_active"

export async function listWorkShifts(options?: {
  activeOnly?: boolean
}): Promise<WorkShiftSummary[]> {
  const supabase = await createClient()
  let query = supabase
    .from("hr_work_shifts")
    .select(SUMMARY_COLUMNS)
    .order("code", { ascending: true })

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as WorkShiftSummary[]
}

export async function getWorkShift(id: string): Promise<WorkShift | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_work_shifts")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as WorkShift | null
}

export async function getWorkShiftByCode(code: string): Promise<WorkShift | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_work_shifts")
    .select("*")
    .eq("code", code)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as WorkShift | null
}

export async function getEmployeeWorkShiftId(
  employeeId: string
): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_employees")
    .select("work_shift_id")
    .eq("id", employeeId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data?.work_shift_id as string | null) ?? null
}

export async function getEmployeeWorkShift(
  employeeId: string
): Promise<WorkShift | null> {
  const shiftId = await getEmployeeWorkShiftId(employeeId)
  if (!shiftId) return null
  return getWorkShift(shiftId)
}
