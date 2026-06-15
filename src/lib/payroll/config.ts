import { getAdminClient } from "@/lib/auth/admin-client"

const CACHE_MS = 60_000

export type PayrollConfig = {
  monthly_std_hours: number
  ot_multiplier: number
  sso_cap: number
  sso_rate: number
  work_entry_regular: string
  work_entry_ot: string
  work_entry_sick: string
  work_entry_annual: string
  odoo_monthly_struct_name: string
  odoo_hourly_struct_name: string
  payroll_cutoff_day: number
  tax_enabled: boolean
  tax_rate: number
  leave_sick_deduct_enabled: boolean
}

export const PAYROLL_CONFIG_KEYS = [
  "monthly_std_hours",
  "ot_multiplier",
  "sso_cap",
  "sso_rate",
  "work_entry_regular",
  "work_entry_ot",
  "work_entry_sick",
  "work_entry_annual",
  "odoo_monthly_struct_name",
  "odoo_hourly_struct_name",
  "payroll_cutoff_day",
  "tax_enabled",
  "tax_rate",
  "leave_sick_deduct_enabled",
] as const

export type PayrollConfigKey = (typeof PAYROLL_CONFIG_KEYS)[number]

const DEFAULTS: Record<PayrollConfigKey, string> = {
  monthly_std_hours: "176",
  ot_multiplier: "1.5",
  sso_cap: "750",
  sso_rate: "0.05",
  work_entry_regular: "WORK100",
  work_entry_ot: "OT",
  work_entry_sick: "LEAVE110",
  work_entry_annual: "LEAVE120",
  odoo_monthly_struct_name: "Monthly Salary - Thailand",
  odoo_hourly_struct_name: "Hourly Wage - Thailand",
  payroll_cutoff_day: "31",
  tax_enabled: "false",
  tax_rate: "0",
  leave_sick_deduct_enabled: "false",
}

let cache: { at: number; map: Map<string, string> } | null = null

async function loadMap(): Promise<Map<string, string>> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) return cache.map

  const admin = getAdminClient()
  const { data } = await admin.from("hr_payroll_config").select("key, value")
  const map = new Map<string, string>()
  for (const key of PAYROLL_CONFIG_KEYS) {
    map.set(key, DEFAULTS[key])
  }
  for (const row of data ?? []) {
    map.set(row.key as string, row.value as string)
  }
  cache = { at: now, map }
  return map
}

function parseConfig(map: Map<string, string>): PayrollConfig {
  const num = (key: PayrollConfigKey, fallback: number) => {
    const n = Number(map.get(key) ?? DEFAULTS[key])
    return Number.isFinite(n) ? n : fallback
  }
  const str = (key: PayrollConfigKey) =>
    (map.get(key) ?? DEFAULTS[key]).trim() || DEFAULTS[key]

  const bool = (key: PayrollConfigKey, fallback: boolean) => {
    const raw = (map.get(key) ?? DEFAULTS[key]).toLowerCase()
    if (raw === "true" || raw === "1") return true
    if (raw === "false" || raw === "0") return false
    return fallback
  }

  return {
    monthly_std_hours: num("monthly_std_hours", 176),
    ot_multiplier: num("ot_multiplier", 1.5),
    sso_cap: num("sso_cap", 750),
    sso_rate: num("sso_rate", 0.05),
    work_entry_regular: str("work_entry_regular"),
    work_entry_ot: str("work_entry_ot"),
    work_entry_sick: str("work_entry_sick"),
    work_entry_annual: str("work_entry_annual"),
    odoo_monthly_struct_name: str("odoo_monthly_struct_name"),
    odoo_hourly_struct_name: str("odoo_hourly_struct_name"),
    payroll_cutoff_day: num("payroll_cutoff_day", 31),
    tax_enabled: bool("tax_enabled", false),
    tax_rate: num("tax_rate", 0),
    leave_sick_deduct_enabled: bool("leave_sick_deduct_enabled", false),
  }
}

export async function getPayrollConfig(): Promise<PayrollConfig> {
  const map = await loadMap()
  return parseConfig(map)
}

export async function getPayrollConfigRows(): Promise<
  Array<{ key: string; value: string; updated_at?: string }>
> {
  const map = await loadMap()
  return PAYROLL_CONFIG_KEYS.map((key) => ({
    key,
    value: map.get(key) ?? DEFAULTS[key],
  }))
}

export function clearPayrollConfigCache() {
  cache = null
}
