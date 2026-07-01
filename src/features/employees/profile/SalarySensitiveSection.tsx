"use client"

import { Lock } from "lucide-react"

import { WidgetCard } from "@/components/brand/WidgetCard"

export function SalarySensitiveSection({
  canAccess,
  title = "ข้อมูลเงินเดือนและการจ่าย",
  description = "เงินเดือน ประเภทการจ่าย บัญชีธนาคาร และวันจ่ายเงินเดือน",
  children,
  className,
}: {
  canAccess: boolean
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
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
          <p className="text-xs text-muted-foreground">{description}</p>
          {children}
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
  if (!canAccess) return null

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm md:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}
