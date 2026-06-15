import { getAdminClient } from "@/lib/auth/admin-client"
import {
  mapLineLanguageToAppLocale,
  type LocaleSource,
} from "@/lib/i18n/map-line-language"
import { coerceLocale, DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types"

export type EmployeeLocaleRow = {
  preferred_locale: AppLocale
  locale_source: LocaleSource
}

export async function getEmployeeLocaleRow(
  lineUserId: string
): Promise<EmployeeLocaleRow | null> {
  const admin = getAdminClient()
  const { data } = await admin
    .from("hr_employees")
    .select("preferred_locale, locale_source")
    .eq("line_user_id", lineUserId)
    .maybeSingle()

  if (!data) return null

  return {
    preferred_locale: coerceLocale(data.preferred_locale),
    locale_source: data.locale_source === "manual" ? "manual" : "line",
  }
}

export async function resolveLocaleForLineUser(
  lineUserId?: string
): Promise<AppLocale> {
  if (!lineUserId) return DEFAULT_LOCALE
  const row = await getEmployeeLocaleRow(lineUserId)
  return row?.preferred_locale ?? DEFAULT_LOCALE
}

export async function resolveLocaleForEmployee(
  employeeId: string
): Promise<AppLocale> {
  const admin = getAdminClient()
  const { data } = await admin
    .from("hr_employees")
    .select("preferred_locale")
    .eq("id", employeeId)
    .maybeSingle()

  return coerceLocale(data?.preferred_locale)
}

/** Sync from LINE app language — skipped when user chose language in Portal. */
export async function syncLocaleFromLineApp({
  employeeId,
  lineLanguage,
}: {
  employeeId: string
  lineLanguage: string
}): Promise<{ updated: boolean; locale: AppLocale; source: LocaleSource }> {
  const admin = getAdminClient()
  const mapped = mapLineLanguageToAppLocale(lineLanguage)

  const { data: row } = await admin
    .from("hr_employees")
    .select("locale_source")
    .eq("id", employeeId)
    .maybeSingle()

  if (!row) {
    return { updated: false, locale: mapped, source: "line" }
  }

  if (row.locale_source === "manual") {
    const { data: current } = await admin
      .from("hr_employees")
      .select("preferred_locale")
      .eq("id", employeeId)
      .single()
    return {
      updated: false,
      locale: coerceLocale(current?.preferred_locale),
      source: "manual",
    }
  }

  const { error } = await admin
    .from("hr_employees")
    .update({
      preferred_locale: mapped,
      locale_source: "line",
    })
    .eq("id", employeeId)

  if (error) throw error

  return { updated: true, locale: mapped, source: "line" }
}

export async function setManualLocale({
  employeeId,
  locale,
}: {
  employeeId: string
  locale: AppLocale
}): Promise<void> {
  const admin = getAdminClient()
  const { error } = await admin
    .from("hr_employees")
    .update({
      preferred_locale: locale,
      locale_source: "manual",
    })
    .eq("id", employeeId)

  if (error) throw error
}
