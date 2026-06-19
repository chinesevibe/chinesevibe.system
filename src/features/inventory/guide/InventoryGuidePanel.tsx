"use client"

import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useInventoryGuide } from "@/features/inventory/guide/InventoryGuideProvider"
import { cn } from "@/lib/utils"

export function InventoryGuidePanel() {
  const {
    open,
    step,
    stepIndex,
    totalSteps,
    completed,
    enabled,
    setOpen,
    goNext,
    goPrev,
    finish,
    restart,
  } = useInventoryGuide()

  if (!enabled) return null

  if (completed && !open) {
    return (
      <div className="fixed bottom-4 right-4 z-[100]">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-brand-red/30 bg-card shadow-lg"
          onClick={restart}
        >
          <BookOpen className="size-4 text-brand-red" />
          เริ่มแนะนำอีกครั้ง
        </Button>
      </div>
    )
  }

  if (!open) return null

  const isLast = stepIndex >= totalSteps - 1
  const progress = Math.round(((stepIndex + 1) / totalSteps) * 100)

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[100] w-[min(100vw-2rem,24rem)]",
        "rounded-xl border border-border/80 bg-card p-4 shadow-xl"
      )}
      role="dialog"
      aria-labelledby="inventory-guide-title"
      aria-describedby="inventory-guide-body"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-red">
            โหมดแนะนำคลัง · {stepIndex + 1}/{totalSteps}
          </p>
          <h3 id="inventory-guide-title" className="mt-0.5 text-sm font-semibold">
            {step.title}
          </h3>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="ปิดชั่วคราว"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-red transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p id="inventory-guide-body" className="text-xs leading-relaxed text-muted-foreground">
        {step.body}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={stepIndex === 0}
          onClick={goPrev}
        >
          <ChevronLeft className="size-4" />
          ก่อนหน้า
        </Button>
        {isLast ? (
          <Button
            type="button"
            size="sm"
            className="bg-brand-red text-white hover:bg-brand-red/90"
            onClick={finish}
          >
            จบการแนะนำ
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="bg-brand-red text-white hover:bg-brand-red/90"
            onClick={goNext}
          >
            ถัดไป
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
