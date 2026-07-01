export type AdminContextTab = {
  id: string
  href: string
  label: string
  closable: boolean
  updatedAt: number
}

type PersistedAdminContextTabsState = {
  tabs?: AdminContextTab[]
  activeId?: string | null
}

function isAdminContextTab(value: unknown): value is AdminContextTab {
  if (!value || typeof value !== "object") return false

  const tab = value as Record<string, unknown>
  return (
    typeof tab.id === "string" &&
    typeof tab.href === "string" &&
    typeof tab.label === "string" &&
    typeof tab.closable === "boolean" &&
    typeof tab.updatedAt === "number"
  )
}

function dedupeTabs(
  tabs: AdminContextTab[],
  maxTabs: number
): AdminContextTab[] {
  const latestById = new Map<string, AdminContextTab>()

  for (const tab of tabs) {
    const previous = latestById.get(tab.id)
    if (!previous || previous.updatedAt <= tab.updatedAt) {
      latestById.set(tab.id, tab)
    }
  }

  return [...latestById.values()]
    .sort((left, right) => left.updatedAt - right.updatedAt)
    .slice(-maxTabs)
}

export function normalizePersistedAdminContextTabsState(
  value: PersistedAdminContextTabsState,
  maxTabs: number
): {
  tabs: AdminContextTab[]
  activeId: string | null
} {
  const tabs = dedupeTabs(
    Array.isArray(value.tabs) ? value.tabs.filter(isAdminContextTab) : [],
    maxTabs
  )

  const activeId =
    typeof value.activeId === "string" && tabs.some((tab) => tab.id === value.activeId)
      ? value.activeId
      : tabs.at(-1)?.id ?? null

  return { tabs, activeId }
}
