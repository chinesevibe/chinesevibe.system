"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { initLiffClient } from "@/lib/line/liff-client"

type RegisterLineContextValue = {
  lineReady: boolean
  lineUserId: string | null
  idToken: string | null
  linked: boolean
  linkedName: string | null
  linkWithEmployeeCode: (employeeCode: string) => Promise<boolean>
}

const RegisterLineContext = createContext<RegisterLineContextValue>({
  lineReady: false,
  lineUserId: null,
  idToken: null,
  linked: false,
  linkedName: null,
  linkWithEmployeeCode: async () => false,
})

export function useRegisterLine() {
  return useContext(RegisterLineContext)
}

export function RegisterLineProvider({ children }: { children: ReactNode }) {
  const [lineReady, setLineReady] = useState(false)
  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const [linked, setLinked] = useState(false)
  const [linkedName, setLinkedName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const ctx = await initLiffClient()
      if (cancelled) return

      if (!ctx.inClient) {
        setLineReady(true)
        return
      }

      if (!ctx.ready) {
        setLineReady(true)
        return
      }

      const liff = (await import("@line/liff")).default
      if (!liff.isLoggedIn()) {
        const current = `${window.location.pathname}${window.location.search}`
        const lang = new URLSearchParams(window.location.search).get("lang")
        const params = new URLSearchParams({ next: current })
        if (lang) params.set("lang", lang)
        window.location.href = `/api/auth/line/start?${params.toString()}`
        return
      }

      const token = liff.getIDToken()
      if (!token || cancelled) {
        setLineReady(true)
        return
      }

      setIdToken(token)

      try {
        const res = await fetch("/api/auth/register/line-link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id_token: token }),
        })
        const data = (await res.json().catch(() => null)) as {
          lineUserId?: string
          linked?: boolean
          employeeName?: string
        } | null

        if (!cancelled && data?.lineUserId) {
          setLineUserId(data.lineUserId)
          if (data.linked) {
            setLinked(true)
            setLinkedName(data.employeeName ?? null)
          }
        }
      } catch (error) {
        console.error("register line-link failed", error)
      } finally {
        if (!cancelled) setLineReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const linkWithEmployeeCode = useCallback(
    async (employeeCode: string): Promise<boolean> => {
      const code = employeeCode.trim()
      if (!code || linked) return linked

      let token = idToken
      if (!token) {
        const ctx = await initLiffClient()
        if (!ctx.ready || !ctx.inClient) return false
        const liff = (await import("@line/liff")).default
        if (!liff.isLoggedIn()) return false
        token = liff.getIDToken()
      }
      if (!token) return false

      try {
        const res = await fetch("/api/auth/link-line", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id_token: token, employee_code: code }),
        })
        const data = (await res.json().catch(() => null)) as {
          linked?: boolean
          alreadyLinked?: boolean
          employeeName?: string
        } | null

        if (res.ok && (data?.linked || data?.alreadyLinked)) {
          setLinked(true)
          setLinkedName(data?.employeeName ?? null)
          return true
        }
      } catch (error) {
        console.error("link-line by code failed", error)
      }
      return false
    },
    [idToken, linked]
  )

  const value = useMemo(
    () => ({
      lineReady,
      lineUserId,
      idToken,
      linked,
      linkedName,
      linkWithEmployeeCode,
    }),
    [lineReady, lineUserId, idToken, linked, linkedName, linkWithEmployeeCode]
  )

  return (
    <RegisterLineContext.Provider value={value}>
      {children}
    </RegisterLineContext.Provider>
  )
}
