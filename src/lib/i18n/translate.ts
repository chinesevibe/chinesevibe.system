import { messages, type MessageKey } from "@/lib/i18n/messages"
import { coerceLocale, type AppLocale } from "@/lib/i18n/types"

export type { MessageKey }

function resolveTemplate(
  key: MessageKey,
  locale: AppLocale
): string | undefined {
  if (locale === "zh" || locale === "my") {
    return (
      messages[locale][key] ?? messages.en[key] ?? messages.th[key]
    )
  }
  if (locale === "en") {
    return messages.en[key] ?? messages.th[key]
  }
  return messages.th[key] ?? messages.en[key]
}

export function t(
  key: MessageKey,
  locale?: AppLocale,
  vars?: Record<string, string | number>
): string {
  const loc = coerceLocale(locale)
  const template = resolveTemplate(key, loc) ?? (key as string)

  if (!vars) return template

  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template
  )
}
