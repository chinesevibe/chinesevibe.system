"use client"

import { useRouter } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { AdminNavGroup } from "@/components/admin/admin-nav"
import type { NotificationInbox } from "@/features/notifications/types"
import { withNavGroupAlertBadges } from "@/features/notifications/nav-badges"
import {
  isNotificationSoundMuted,
  playNotificationSound,
  setNotificationSoundMuted,
} from "@/lib/notifications/play-notification-sound"

const POLL_MS = 15_000

function inboxFingerprint(inbox: NotificationInbox): string {
  return JSON.stringify({
    approvalTotal: inbox.approvalTotal,
    total: inbox.total,
    complianceTotal: inbox.complianceTotal,
    navBadges: inbox.navBadges,
    itemIds: inbox.items.map((item) => item.id),
  })
}

type AdminNotificationContextValue = {
  inbox: NotificationInbox
  navGroups: AdminNavGroup[]
  soundMuted: boolean
  setSoundMuted: (muted: boolean) => void
  refresh: (opts?: { showLoading?: boolean }) => Promise<void>
  loading: boolean
}

const AdminNotificationContext =
  createContext<AdminNotificationContextValue | null>(null)

export function useAdminNotifications(): AdminNotificationContextValue {
  const ctx = useContext(AdminNotificationContext)
  if (!ctx) {
    throw new Error("useAdminNotifications must be used within AdminNotificationProvider")
  }
  return ctx
}

export function useAdminNotificationsOptional(): AdminNotificationContextValue | null {
  return useContext(AdminNotificationContext)
}

export function AdminNotificationProvider({
  children,
  initialInbox,
  baseNavGroups,
}: {
  children: ReactNode
  initialInbox: NotificationInbox
  baseNavGroups: AdminNavGroup[]
}) {
  const [inbox, setInbox] = useState(initialInbox)
  const [loading, setLoading] = useState(false)
  const [soundMuted, setSoundMutedState] = useState(() =>
    isNotificationSoundMuted()
  )
  const prevApprovalRef = useRef(initialInbox.approvalTotal)
  const inboxFingerprintRef = useRef(inboxFingerprint(initialInbox))
  const seededRef = useRef(false)
  const router = useRouter()

  const navGroups = useMemo(
    () =>
      Object.keys(inbox.navBadges).length > 0
        ? withNavGroupAlertBadges(baseNavGroups, inbox.navBadges)
        : baseNavGroups,
    [baseNavGroups, inbox.navBadges]
  )

  const setSoundMuted = useCallback((muted: boolean) => {
    setSoundMutedState(muted)
    setNotificationSoundMuted(muted)
  }, [])

  const refresh = useCallback(async (opts?: { showLoading?: boolean }) => {
    if (opts?.showLoading) setLoading(true)
    try {
      const res = await fetch("/api/notifications", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache" },
      })
      if (!res.ok) {
        console.warn("notifications poll failed:", res.status)
        return
      }
      const data = (await res.json()) as NotificationInbox
      const prev = prevApprovalRef.current
      const next = data.approvalTotal ?? 0
      const nextFingerprint = inboxFingerprint(data)

      if (
        seededRef.current &&
        next > prev &&
        !soundMuted &&
        document.visibilityState === "visible"
      ) {
        playNotificationSound()
      }

      const inboxChanged = nextFingerprint !== inboxFingerprintRef.current
      seededRef.current = true
      prevApprovalRef.current = next
      inboxFingerprintRef.current = nextFingerprint
      setInbox(data)

      if (inboxChanged) {
        router.refresh()
      }
    } finally {
      if (opts?.showLoading) setLoading(false)
    }
  }, [router, soundMuted])

  useEffect(() => {
    const bootId = window.setTimeout(() => {
      void refresh()
    }, 0)

    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearTimeout(bootId)
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      inbox,
      navGroups,
      soundMuted,
      setSoundMuted,
      refresh,
      loading,
    }),
    [inbox, navGroups, soundMuted, setSoundMuted, refresh, loading]
  )

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
    </AdminNotificationContext.Provider>
  )
}
