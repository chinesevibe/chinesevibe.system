"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  approveInvInboundOrder,
  cancelInvInboundOrder,
  submitInvInboundOrder,
} from "@/features/inventory/actions/inbound"
import { inboundScanHref } from "@/lib/line/inbound-scan-url"
import type { InvInboundStatus } from "@/features/inventory/types"

export function InboundOrderActions({
  orderId,
  status,
  canManage,
}: {
  orderId: string
  status: InvInboundStatus
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!canManage) return null

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.success) {
        setMessage("บันทึกแล้ว")
        router.refresh()
      } else {
        setError(result.error ?? "ไม่สำเร็จ")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => submitInvInboundOrder(orderId))}
        >
          เปิดรับสแกน
        </Button>
      ) : null}
      {status === "pending" ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => approveInvInboundOrder(orderId))}
        >
          ตรวจแล้ว — อนุมัติ (+สต็อก)
        </Button>
      ) : null}
      {status === "draft" || status === "pending" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => cancelInvInboundOrder(orderId))}
        >
          ยกเลิก
        </Button>
      ) : null}
      {status === "pending" ? (
        <a
          href={inboundScanHref(orderId)}
          className="text-sm font-medium text-brand-red underline"
          target="_blank"
          rel="noreferrer"
        >
          เปิด LIFF สแกน →
        </a>
      ) : null}
      {message ? <span className="text-sm text-green-600">{message}</span> : null}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  )
}
