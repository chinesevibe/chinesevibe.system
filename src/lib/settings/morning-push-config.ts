export type MorningPushGroup = "employee" | "officer"

export type MorningPushGroupConfig = {
  enabled: boolean
  fallbackTime: string
  remindAfterMin: number
  days: number[]
}

export type RuntimeConfigRow = {
  key: string
  value: string
}

export const MORNING_PUSH_DEFAULTS: Record<
  MorningPushGroup,
  MorningPushGroupConfig
> = {
  employee: {
    enabled: true,
    fallbackTime: "14:10",
    remindAfterMin: 0,
    days: [1, 2, 3, 4, 5],
  },
  officer: {
    enabled: true,
    fallbackTime: "14:10",
    remindAfterMin: 0,
    days: [1, 2, 3, 4, 5],
  },
}

const VALID_TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === "true") return true
  if (value === "false") return false
  return fallback
}

function parseTime(value: string | undefined, fallback: string) {
  return value && VALID_TIME_RE.test(value) ? value : fallback
}

function parseRemindMinutes(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 120) {
    return fallback
  }
  return parsed
}

function parseDays(value: string | undefined, fallback: number[]) {
  if (!value) return fallback
  const days = value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
  const unique = [...new Set(days)].sort((a, b) => a - b)
  return unique.length > 0 ? unique : fallback
}

export function parseMorningPushFromRows(
  rows: RuntimeConfigRow[]
): Record<MorningPushGroup, MorningPushGroupConfig> {
  const map = new Map(rows.map((row) => [row.key, row.value]))

  function parseGroup(group: MorningPushGroup): MorningPushGroupConfig {
    const defaults = MORNING_PUSH_DEFAULTS[group]
    const prefix = `morning_push_${group}_`
    const fallbackTime =
      map.get(`${prefix}fallback_time`) ?? map.get(`${prefix}fallback_time_2`)
    return {
      enabled: parseBoolean(map.get(`${prefix}enabled`), defaults.enabled),
      fallbackTime: parseTime(fallbackTime, defaults.fallbackTime),
      remindAfterMin: parseRemindMinutes(
        map.get(`${prefix}remind_after_min`),
        defaults.remindAfterMin
      ),
      days: parseDays(map.get(`${prefix}days`), defaults.days),
    }
  }

  return {
    employee: parseGroup("employee"),
    officer: parseGroup("officer"),
  }
}

export function serializeMorningPushPatch(
  group: MorningPushGroup,
  config: MorningPushGroupConfig
): Record<string, string> {
  const prefix = `morning_push_${group}_`
  return {
    [`${prefix}enabled`]: config.enabled ? "true" : "false",
    [`${prefix}fallback_time`]: config.fallbackTime,
    [`${prefix}fallback_time_2`]: config.fallbackTime,
    [`${prefix}remind_after_min`]: String(config.remindAfterMin),
    [`${prefix}days`]: [...config.days].sort((a, b) => a - b).join(","),
  }
}
