"use client"

import { Suspense, use } from "react"

import { LiffLanguageSwitcher } from "@/components/liff/LiffLanguageSwitcher"
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-[#F5F5F5] p-4">
      <div className="flex justify-end">
        <LiffLanguageSwitcher />
      </div>
      <Suspense
        fallback={
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm">
            {tx("liff.inbound.loading")}
          </div>
        }
      >
        <InboundScanByOrder params={params} />
      </Suspense>
    </main>
  )
}
