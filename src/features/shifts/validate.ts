import type { SupabaseClient } from "@supabase/supabase-js"

export async function validateWorkShiftId(
  supabase: SupabaseClient,
  workShiftId: string | null | undefined
): Promise<string | null> {
  if (workShiftId === null || workShiftId === undefined || workShiftId === "") {
    return null
  }

  const { data, error } = await supabase
    .from("hr_work_shifts")
    .select("id")
    .eq("id", workShiftId)
    .eq("is_active", true)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error("work shift not found")
  }

  return workShiftId
}
