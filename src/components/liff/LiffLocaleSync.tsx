"use client"

import { useEffect } from "react"

import { initLiffClient } from "@/lib/line/liff-client"

/**
 * On LIFF load: read LINE app language (liff.getLanguage) and sync to DB
 * so CNV WorkHub webhook messages use the same language.
 */
export function LiffLocaleSync() {
  useEffect(() => {
    let cancelled = false

    async function syncFromLine() {
      const ctx = await initLiffClient()
      if (cancelled || !ctx.ready) return

      const liff = (await import("@line/liff")).default
      const language =
        typeof liff.getLanguage === "function" ? liff.getLanguage() : null
      if (!language) return

      await fetch("/api/liff/locale/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language }),
      }).catch(() => undefined)
    }

    void syncFromLine()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
