"use client"

import {
  useEffect,
  useRef,
} from "react"
import {
  usePathname,
  useSearchParams,
} from "next/navigation"

const STORAGE_KEY = "cnv-admin-context-tab-scroll"

function buildViewportKey(pathname: string, searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams.toString())
  next.delete("returnTo")
  const search = next.toString()
  return search ? `${pathname}?${search}` : pathname
}

export function AdminContentViewport({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const key = buildViewportKey(pathname, new URLSearchParams(searchParams.toString()))
  const mainRef = useRef<HTMLElement | null>(null)
  const positionsRef = useRef<Record<string, number>>({})

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, number>
      positionsRef.current = parsed
    } catch {
      positionsRef.current = {}
    }
  }, [])

  useEffect(() => {
    function persistPositions() {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positionsRef.current))
      } catch {
        // Ignore storage failures and keep state in memory.
      }
    }

    window.addEventListener("pagehide", persistPositions)
    return () => {
      persistPositions()
      window.removeEventListener("pagehide", persistPositions)
    }
  }, [])

  useEffect(() => {
    const main = mainRef.current
    if (!main) return

    const restoreId = window.requestAnimationFrame(() => {
      main.scrollTo({
        top: positionsRef.current[key] ?? 0,
        behavior: "auto",
      })
    })

    const handleScroll = () => {
      positionsRef.current[key] = main.scrollTop
    }

    handleScroll()
    main.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(restoreId)
      positionsRef.current[key] = main.scrollTop
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positionsRef.current))
      } catch {
        // Ignore storage failures and keep state in memory.
      }
      main.removeEventListener("scroll", handleScroll)
    }
  }, [key])

  return (
    <main
      ref={mainRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 md:p-4 lg:p-5"
    >
      {children}
    </main>
  )
}
