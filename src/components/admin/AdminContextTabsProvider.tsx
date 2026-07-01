"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  normalizePersistedAdminContextTabsState,
  type AdminContextTab,
} from "@/components/admin/admin-context-tabs-state"

type AdminContextTabsState = {
  activeId: string | null
  tabs: AdminContextTab[]
  closeTab: (id: string) => void
}

const STORAGE_KEY = "cnv-admin-context-tabs"
const MAX_TABS = 10

const AdminContextTabsContext = createContext<AdminContextTabsState | null>(null)

function normalizeHref(pathname: string, searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams.toString())
  next.delete("returnTo")
  const search = next.toString()
  return search ? `${pathname}?${search}` : pathname
}

function humanizeSegment(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function buildTabDescriptor(
  pathname: string,
  searchParams: URLSearchParams
): Omit<AdminContextTab, "updatedAt"> | null {
  if (!pathname.startsWith("/admin")) return null

  const href = normalizeHref(pathname, searchParams)

  const exactLabels: Record<string, string> = {
    "/admin": "แดชบอร์ด",
    "/admin/employees": "พนักงาน",
    "/admin/attendance": "การเข้างาน",
    "/admin/leaves": "จัดการลา",
    "/admin/overtime": "OT",
    "/admin/documents": "เอกสาร",
    "/admin/complaints": "ข้อร้องเรียน",
    "/admin/alerts": "การแจ้งเตือน",
    "/admin/payroll": "Payroll",
    "/admin/settings": "ตั้งค่า",
    "/admin/organization": "โครงสร้างองค์กร",
    "/admin/branches": "สาขา",
    "/admin/report": "รายงานและวิเคราะห์",
  }

  const exactLabel = exactLabels[pathname]
  if (exactLabel) {
    return {
      id: pathname,
      href,
      label: exactLabel,
      closable: pathname !== "/admin",
    }
  }

  if (/^\/admin\/employees\/[^/]+\/attendance$/.test(pathname)) {
    return {
      id: pathname,
      href,
      label: "การเข้างาน · พนักงาน",
      closable: true,
    }
  }

  if (/^\/admin\/employees\/[^/]+$/.test(pathname)) {
    return {
      id: pathname,
      href,
      label: "โปรไฟล์พนักงาน",
      closable: true,
    }
  }

  if (/^\/admin\/branches\/[^/]+\/attendance$/.test(pathname)) {
    return {
      id: pathname,
      href,
      label: "การเข้างาน · สาขา",
      closable: true,
    }
  }

  const segments = pathname.split("/").filter(Boolean)
  const fallback = segments.at(-1)
  if (!fallback) return null

  return {
    id: pathname,
    href,
    label: humanizeSegment(fallback),
    closable: true,
  }
}

export function AdminContextTabsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hydratedRef = useRef(false)
  const current = useMemo(
    () => buildTabDescriptor(pathname, new URLSearchParams(searchParams.toString())),
    [pathname, searchParams]
  )
  const [tabs, setTabs] = useState<AdminContextTab[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as {
          tabs?: AdminContextTab[]
          activeId?: string | null
        }
        const normalized = normalizePersistedAdminContextTabsState(parsed, MAX_TABS)
        setTabs(normalized.tabs)
        setActiveId(normalized.activeId)
      } catch {
        setTabs([])
        setActiveId(null)
      } finally {
        hydratedRef.current = true
      }
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current || !current) return

    setTabs((prev) => {
      const now = Date.now()
      const nextTab: AdminContextTab = { ...current, updatedAt: now }
      const existingIndex = prev.findIndex((tab) => tab.id === current.id)
      const nextTabs =
        existingIndex === -1
          ? [...prev, nextTab]
          : prev.map((tab, index) => (index === existingIndex ? nextTab : tab))

      return normalizePersistedAdminContextTabsState(
        { tabs: nextTabs, activeId: current.id },
        MAX_TABS
      ).tabs
    })
    setActiveId(current.id)
  }, [current])

  useEffect(() => {
    if (!hydratedRef.current) return
    try {
      const normalized = normalizePersistedAdminContextTabsState(
        { tabs, activeId },
        MAX_TABS
      )
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    } catch {
      // Ignore storage failures and keep tabs in memory.
    }
  }, [tabs, activeId])

  function closeTab(id: string) {
    setTabs((prev) => {
      const index = prev.findIndex((tab) => tab.id === id)
      if (index === -1) return prev

      const closingActive = activeId === id
      const nextTabs = prev.filter((tab) => tab.id !== id)

      if (closingActive) {
        const fallback = nextTabs[index - 1] ?? nextTabs[index] ?? null
        setActiveId(fallback?.id ?? null)
        router.push(fallback?.href ?? "/admin", { scroll: false })
      }

      return nextTabs
    })
  }

  return (
    <AdminContextTabsContext.Provider
      value={{
        activeId,
        tabs,
        closeTab,
      }}
    >
      {children}
    </AdminContextTabsContext.Provider>
  )
}

export function useAdminContextTabs() {
  const context = useContext(AdminContextTabsContext)
  if (!context) {
    throw new Error("useAdminContextTabs must be used within AdminContextTabsProvider")
  }
  return context
}
