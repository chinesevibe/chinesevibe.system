"use client"

import { Suspense, use } from "react"

import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { InboundScanPageContent } from "@/features/inventory/InboundScanPageContent"
import { useLocale } from "@/features/portal/LocaleProvider"

function InboundScanByOrder({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = use(params)
  return <InboundScanPageContent pathOrderId={orderId} />
}

export default function InboundScanOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { tx } = useLocale()
  return (
    <LiffPageShell title="สแกนรับเข้า" subtitle="สแกนสินค้าเข้าตามใบที่เปิดอยู่" backHref="/portal/inbound">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Suspense
          fallback={
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm">
              {tx("liff.inbound.loading")}
            </div>
          }
        >
          <InboundScanByOrder params={params} />
        </Suspense>
      </div>
    </LiffPageShell>
  )
}
