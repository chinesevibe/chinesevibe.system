"use client"

import { useEffect, useRef, useState } from "react"

export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error"

export function useDebouncedAutoSave({
  snapshot,
  enabled,
  delayMs = 900,
  onSave,
}: {
  snapshot: string
  enabled: boolean
  delayMs?: number
  onSave: () => Promise<void>
}) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const savedSnapshot = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!enabled) return

    if (savedSnapshot.current === null) {
      savedSnapshot.current = snapshot
      return
    }

    if (savedSnapshot.current === snapshot) return

    setStatus("pending")
    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(async () => {
      setStatus("saving")
      setError(null)
      try {
        await onSaveRef.current()
        savedSnapshot.current = snapshot
        setStatus("saved")
      } catch (e) {
        setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ")
        setStatus("error")
      }
    }, delayMs)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [snapshot, enabled, delayMs])

  function markSaved(nextSnapshot: string) {
    savedSnapshot.current = nextSnapshot
    setStatus("saved")
    setError(null)
  }

  return { status, error, markSaved }
}

export function autoSaveStatusText(status: AutoSaveStatus): string | null {
  switch (status) {
    case "pending":
      return "รอบันทึก…"
    case "saving":
      return "กำลังบันทึกอัตโนมัติ…"
    case "saved":
      return "บันทึกอัตโนมัติแล้ว"
    case "error":
      return null
    default:
      return null
  }
}
