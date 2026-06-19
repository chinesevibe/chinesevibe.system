import type { SupabaseClient } from "@supabase/supabase-js"

function isOffDaysSchemaCacheError(message: string): boolean {
  return /off_days/i.test(message) && /schema cache/i.test(message)
}

type UpdateResult<T> = {
  data: T | null
  error: { message: string; code?: string } | null
  offDaysSkipped?: boolean
}

/** Apply hr_employees update; retry without off_days if PostgREST schema cache is stale. */
export async function applyEmployeeUpdates<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  id: string,
  updates: Record<string, unknown>,
  select: string
): Promise<UpdateResult<T>> {
  const first = await supabase
    .from("hr_employees")
    .update(updates)
    .eq("id", id)
    .select(select)
    .maybeSingle()

  if (!first.error || !("off_days" in updates)) {
    return { data: first.data as T | null, error: first.error }
  }

  if (!isOffDaysSchemaCacheError(first.error.message)) {
    return { data: first.data as T | null, error: first.error }
  }

  const { off_days: _offDays, ...rest } = updates
  if (Object.keys(rest).length === 0) {
    return {
      data: null,
      error: {
        message:
          "วันหยุดประจำสัปดาห์ยังบันทึกไม่ได้ชั่วคราว (รอ Supabase reload schema) — ลองอีกครั้งใน 1–2 นาที",
      },
      offDaysSkipped: true,
    }
  }

  const retry = await supabase
    .from("hr_employees")
    .update(rest)
    .eq("id", id)
    .select(select)
    .maybeSingle()

  return {
    data: retry.data as T | null,
    error: retry.error,
    offDaysSkipped: !retry.error,
  }
}
