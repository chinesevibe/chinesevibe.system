"use client"

import { Eye, EyeOff, Lock } from "lucide-react"
import { useState } from "react"

import { WidgetCard } from "@/components/brand/WidgetCard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SalarySensitiveSection({
  canAccess,
  title = "ข้อมูลเงินเดือนและการจ่าย",
  description = "เงินเดือน ประเภทการจ่าย บัญชีธนาคาร และวันจ่ายเงินเดือน",
  children,
  className,
  revealed: controlledRevealed,
  onRevealedChange,
}: {
  canAccess: boolean
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  revealed?: boolean
  onRevealedChange?: (revealed: boolean) => void
}) {
  const [internalRevealed, setInternalRevealed] = useState(false)
  const revealed = controlledRevealed ?? internalRevealed
  const setRevealed = onRevealedChange ?? setInternalRevealed

  if (!canAccess) {
    return (
      <div className={className}>
        <WidgetCard title={title}>
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">ข้อมูลส่วนตัวด้านการเงิน</p>
              <p className="mt-1">
                เฉพาะ HR / Dev / CEO เท่านั้นที่ดูหรือแก้ไขข้อมูลเงินเดือนได้
              </p>
            </div>
          </div>
        </WidgetCard>
      </div>
    )
  }

  return (
    <div className={className}>
      <WidgetCard title={title}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{description}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? (
              <>
                <EyeOff className="size-3.5" />
                ซ่อนข้อมูล
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                แสดงข้อมูลเงินเดือน
              </>
            )}
          </Button>
        </div>

        {revealed ? (
          children
        ) : (
          <div
            className={cn(
              "rounded-lg border border-border/60 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground"
            )}
          >
            กด &quot;แสดงข้อมูลเงินเดือน&quot; เพื่อดูและแก้ไขข้อมูลด้านการเงิน
          </div>
        )}
      </div>
    </WidgetCard>
    </div>
  )
}

export function SalarySensitiveView({
  canAccess,
  title = "ข้อมูลเงินเดือนและการจ่าย",
  children,
}: {
  canAccess: boolean
  title?: string
  children: React.ReactNode
}) {
  const [revealed, setRevealed] = useState(false)

  if (!canAccess) return null

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm md:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
            onClick={() => setRevealed(!revealed)}
        >
          {revealed ? (
            <>
              <EyeOff className="size-3.5" />
              ซ่อน
            </>
          ) : (
            <>
              <Eye className="size-3.5" />
              แสดง
            </>
          )}
        </Button>
      </div>
      {revealed ? children : (
        <p className="text-sm text-muted-foreground">ข้อมูลเงินเดือนถูกซ่อน — กดแสดงเพื่อดู</p>
      )}
    </div>
  )
}
