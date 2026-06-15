"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { LucideIcon } from "lucide-react"

import { DevelopmentEmptyState } from "@/components/brand/DevelopmentEmptyState"
import { Button } from "@/components/ui/button"

type QueueItem = {
  id: string
  label: string
  meta?: string
  decidePath: string
}

export function ApprovalQueue({
  title,
  items,
  emptyText,
  emptyIcon,
}: {
  title: string
  items: QueueItem[]
  emptyText: string
  emptyIcon?: LucideIcon
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(item: QueueItem, action: "approve" | "reject") {
    setBusyId(item.id)
    setError(null)
    try {
      const note =
        action === "reject"
          ? window.prompt("เหตุผลที่ปฏิเสธ (อย่างน้อย 3 ตัวอักษร)") ?? ""
          : ""
      if (action === "reject" && note.trim().length < 3) {
        setError("ต้องระบุเหตุผลการปฏิเสธ")
        return
      }

      const res = await fetch(item.decidePath, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error ?? "ดำเนินการไม่สำเร็จ")
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <h2 className="mb-3 shrink-0 text-sm font-semibold">{title}</h2>
      {items.length === 0 ? (
        emptyIcon ? (
          <DevelopmentEmptyState icon={emptyIcon} title={emptyText} />
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                {item.meta ? (
                  <p className="text-xs text-muted-foreground">{item.meta}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busyId === item.id}
                  onClick={() => decide(item, "approve")}
                >
                  อนุมัติ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === item.id}
                  onClick={() => decide(item, "reject")}
                >
                  ปฏิเสธ
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-2 shrink-0 text-sm text-destructive">{error}</p> : null}
    </section>
  )
}
