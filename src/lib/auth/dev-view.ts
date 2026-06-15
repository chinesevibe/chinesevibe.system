import {
  ADMIN_NAV_GROUPS,
  flattenAdminNavGroups,
  isAdminNavActive,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/components/admin/admin-nav"
import { BRANCH_NAV_ITEMS, isBranchNavActive } from "@/components/admin/branch-nav"

export const DEV_VIEW_COOKIE = "dev_view_as"

export type DevViewAs = "hr" | "ceo" | "branch"

export const DEV_VIEW_OPTIONS: Array<{
  id: DevViewAs
  label: string
  description: string
}> = [
  { id: "hr", label: "HR Admin", description: "มุมมอง HR" },
  { id: "ceo", label: "CEO", description: "มุมมองผู้บริหาร" },
  { id: "branch", label: "Branch Manager", description: "มุมมองหัวหน้าสาขา" },
]

export function parseDevViewAs(value: string | undefined): DevViewAs {
  if (value === "hr" || value === "ceo" || value === "branch") {
    return value
  }
  // Legacy cookie "all" → HR Admin
  return "hr"
}

export function getDevNavGroups(view: DevViewAs): AdminNavGroup[] {
  switch (view) {
    case "hr":
    case "ceo":
      return ADMIN_NAV_GROUPS
    case "branch":
      return [{ title: "", items: BRANCH_NAV_ITEMS }]
  }
}

/** @deprecated Use getDevNavGroups */
export function getDevNavItems(view: DevViewAs): AdminNavItem[] {
  return flattenAdminNavGroups(getDevNavGroups(view))
}

export function getDevNavMode(view: DevViewAs): {
  branchMode: boolean
  devAllMode: boolean
} {
  return {
    branchMode: view === "branch",
    devAllMode: false,
  }
}

export function isDevNavActive(pathname: string, href: string): boolean {
  return isAdminNavActive(pathname, href) || isBranchNavActive(pathname, href)
}

export function devViewLabel(view: DevViewAs): string {
  return DEV_VIEW_OPTIONS.find((o) => o.id === view)?.label ?? "HR Admin"
}
