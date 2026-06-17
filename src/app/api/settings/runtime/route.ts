import { NextResponse, type NextRequest } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { clearRuntimeConfigCache } from "@/lib/runtime-config"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_KEYS = new Set([
  "work_start_hour",
  "work_start_minute",
  "hr_line_group_id",
  "morning_push_employee_enabled",
  "morning_push_employee_fallback_time",
  "morning_push_employee_fallback_time_2",
  "morning_push_employee_remind_after_min",
  "morning_push_employee_days",
  "morning_push_officer_enabled",
  "morning_push_officer_fallback_time",
  "morning_push_officer_fallback_time_2",
  "morning_push_officer_remind_after_min",
  "morning_push_officer_days",
])

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function validateRuntimeConfig(key: string, value: string): string | null {
  if (key.endsWith("_enabled")) {
    if (value !== "true" && value !== "false") {
      return "ค่าสวิตช์ Morning Push ต้องเป็น true หรือ false"
    }
    return null
  }

  if (key.endsWith("_fallback_time_2") || key.endsWith("_fallback_time")) {
    if (!TIME_RE.test(value)) {
      return "เวลา fallback ต้องอยู่ในรูปแบบ HH:MM"
    }
    return null
  }

  if (key.endsWith("_remind_after_min")) {
    const remind = Number.parseInt(value, 10)
    if (!Number.isInteger(remind) || remind < 0 || remind > 120) {
      return "เตือนหลังเริ่มงานต้องเป็นตัวเลข 0-120 นาที"
    }
    return null
  }

  if (key.endsWith("_days")) {
    const parts = value.split(",").map((part) => part.trim()).filter(Boolean)
    const numbers = parts.map((part) => Number.parseInt(part, 10))
    const unique = new Set(numbers)
    if (
      parts.length === 0 ||
      numbers.some((day) => !Number.isInteger(day) || day < 1 || day > 7) ||
      unique.size !== numbers.length
    ) {
      return "วันทำงานต้องเป็นเลข 1-7 คั่นด้วยจุลภาคและห้ามซ้ำ"
    }
    return null
  }

  return null
}

export async function GET() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from("hr_runtime_config").select("key, value, updated_at")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rows: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const entries = Object.entries(body).filter(([k]) => ALLOWED_KEYS.has(k))
  if (entries.length === 0) {
    return NextResponse.json({ error: "no valid keys" }, { status: 400 })
  }

  const supabase = await createClient()
  for (const [key, value] of entries) {
    const trimmed = String(value).trim()
    const validationError = validateRuntimeConfig(key, trimmed)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const { error } = await supabase
      .from("hr_runtime_config")
      .upsert({ key, value: trimmed })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  clearRuntimeConfigCache()
  return NextResponse.json({ ok: true, updated: entries.map(([k]) => k) })
}
