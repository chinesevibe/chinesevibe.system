import type { RichMenuPostbackAction } from "@/lib/line/types"
import type { AppLocale } from "@/lib/i18n/types"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

/** Slash/text shortcuts — work even when LINE_USER_CHAT_ENABLED=false */
const SLASH_COMMANDS: Record<string, RichMenuPostbackAction> = {
  "/leave": "leave",
  "/ลา": "leave",
  "/ot": "overtime",
  "/overtime": "overtime",
  "/doc": "document",
  "/document": "document",
  "/เอกสาร": "document",
  "/complaint": "complaint",
  "/ร้องเรียน": "complaint",
  "/announce": "announcement",
  "/ประกาศ": "announcement",
  "/stock": "check_stock",
  "/สต็อก": "check_stock",
  "/inbound": "inventory",
  "/รับเข้า": "inventory",
}

export function isStockCommandEnabled(): boolean {
  return process.env.LINE_STOCK_COMMAND_ENABLED === "true"
}

export function parseSlashCommand(text: string): RichMenuPostbackAction | null {
  const key = text.trim().toLowerCase()
  return SLASH_COMMANDS[key] ?? SLASH_COMMANDS[text.trim()] ?? null
}

export function stockCommandDisabledMessage(
  locale: AppLocale = DEFAULT_LOCALE
): { type: "text"; text: string } {
  return {
    type: "text",
    text: t("line.stock.disabled", locale),
  }
}
