import { Suspense } from "react"
import Link from "next/link"

import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { buttonVariants } from "@/components/ui/button"
import { InboundScanPageContent } from "@/features/inventory/InboundScanPageContent"
import { cn } from "@/lib/utils"

type PageProps = {
  searchParams: Promise<{ order?: string; "liff.state"?: string; lang?: string }>
}

export default async function InboundScanPage({ searchParams }: PageProps) {
  const params = await searchParams
  const hasOrderHint = Boolean(params.order?.trim() || params["liff.state"]?.trim())

  return (
    <LiffPageShell title="สแกนรับเข้า" subtitle="เปิดใบรับเข้าที่ต้องการ แล้วสแกนของต่อได้ทันที" backHref="/portal/inbound">
      <div className="flex flex-1 flex-col gap-4 p-4">
        {!hasOrderHint ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-base font-semibold text-foreground">ไม่พบใบรับเข้า</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              เปิดจากใบรับเข้าที่ต้องการสแกน หรือกลับไปหน้าคลังสินค้าเพื่อเลือกใบรับก่อน
            </p>
            <Link
              href="/portal/inbound"
              className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
            >
              ไปหน้าใบรับเข้า
            </Link>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm">
                กำลังโหลดใบรับเข้า…
              </div>
            }
          >
            <InboundScanPageContent />
          </Suspense>
        )}
      </div>
    </LiffPageShell>
  )
}
