import { NextResponse, type NextRequest } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import {
  clearPayrollConfigCache,
  PAYROLL_CONFIG_KEYS,
  type PayrollConfigKey,
} from "@/lib/payroll/config"
import { createClient } from "@/lib/supabase/server"

const ALLOWED_KEYS = new Set<string>(PAYROLL_CONFIG_KEYS)

export async function GET() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_payroll_config")
    .select("key, value, updated_at")

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
    if (!trimmed) {
      return NextResponse.json({ error: `value required for ${key}` }, { status: 400 })
    }
    if (
      (key as PayrollConfigKey) === "monthly_std_hours" ||
      (key as PayrollConfigKey) === "ot_multiplier" ||
      (key as PayrollConfigKey) === "sso_cap" ||
      (key as PayrollConfigKey) === "sso_rate" ||
      (key as PayrollConfigKey) === "payroll_cutoff_day" ||
      (key as PayrollConfigKey) === "tax_rate"
    ) {
      const n = Number(trimmed)
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `invalid number for ${key}` }, { status: 400 })
      }
      if ((key as PayrollConfigKey) === "payroll_cutoff_day" && (n < 1 || n > 31)) {
        return NextResponse.json({ error: "payroll_cutoff_day must be 1-31" }, { status: 400 })
      }
    }

    const { error } = await supabase
      .from("hr_payroll_config")
      .upsert({ key, value: trimmed })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  clearPayrollConfigCache()
  return NextResponse.json({ ok: true, updated: entries.map(([k]) => k) })
}
