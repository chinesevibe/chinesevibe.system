/** Serializable nav item — safe to pass from Server Components to client sidebar */
import type { MessageKey } from "@/lib/i18n/messages"

export type AdminNavIconName =
  | "layout-dashboard"
  | "users"
  | "building"
  | "clock"
  | "calendar"
  | "timer"
  | "wallet"
  | "target"
  | "user-search"
  | "graduation-cap"
  | "file-text"
  | "message-warning"
  | "megaphone"
  | "bar-chart"
  | "settings"
  | "list-checks"
  | "organization"
  | "branches"
  | "inventory"
  | "bell"

export type AdminNavItem = {
  label?: string
  labelKey?: MessageKey
  href: string
  icon: AdminNavIconName
  comingSoon?: boolean
  badge?: number
}

export type AdminNavGroup = {
  title: string
  items: AdminNavItem[]
}
