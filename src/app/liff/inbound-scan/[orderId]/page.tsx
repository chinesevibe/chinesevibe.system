"use client"

import { Suspense, use } from "react"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-background p-4">
      <Suspense
        fallback={
          <Card className="w-full">
            <CardContent className="py-8 text-sm text-muted-foreground">
              {tx("liff.inbound.loading")}
            </CardContent>
          </Card>
        }
      >
        <InboundScanByOrder params={params} />
      </Suspense>
    </main>
  )
}
