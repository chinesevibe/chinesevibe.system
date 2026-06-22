"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[24rem] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-background p-6 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-foreground">โหลดหน้ารายชื่อพนักงานไม่สำเร็จ</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          ลองโหลดใหม่อีกครั้ง หากยังไม่สำเร็จให้ตรวจ query หรือการเชื่อมต่อฐานข้อมูล
        </p>
        <p className="mt-3 rounded-xl bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground">
          {error.message || "Unknown error"}
        </p>
        <div className="mt-4 flex justify-center">
          <Button type="button" onClick={reset}>
            ลองใหม่
          </Button>
        </div>
      </div>
    </div>
  )
}
