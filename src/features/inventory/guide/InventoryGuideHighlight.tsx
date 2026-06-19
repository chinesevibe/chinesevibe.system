"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { useInventoryGuide } from "@/features/inventory/guide/InventoryGuideProvider"
import { cn } from "@/lib/utils"

type Rect = {
  top: number
  left: number
  width: number
  height: number
}

function measureTarget(selector: string): Rect | null {
  const el = document.querySelector(`[data-inventory-guide="${selector}"]`)
  if (!el) return null
  const box = el.getBoundingClientRect()
  const pad = 6
  return {
    top: box.top - pad,
    left: box.left - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  }
}

export function InventoryGuideHighlight() {
  const { open, step } = useInventoryGuide()
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!open || !step.target) {
      const clear = window.requestAnimationFrame(() => setRect(null))
      return () => window.cancelAnimationFrame(clear)
    }

    const update = () => {
      setRect(measureTarget(step.target!))
    }

    const initial = window.requestAnimationFrame(update)
    const timer = window.setTimeout(update, 120)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)

    return () => {
      window.cancelAnimationFrame(initial)
      window.clearTimeout(timer)
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [open, step.target, step.id])

  if (typeof document === "undefined" || !open || !rect) return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden
    >
      <div
        className={cn(
          "absolute rounded-xl border-2 border-brand-red",
          "animate-pulse ring-2 ring-brand-red/40"
        )}
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          position: "fixed",
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
        }}
      />
    </div>,
    document.body
  )
}
