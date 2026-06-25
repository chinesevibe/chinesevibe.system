import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { InboundScanPageContent } from "@/features/inventory/InboundScanPageContent"
import { listInvInboundOrders } from "@/features/inventory/inbound-data"
import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { coerceLocale } from "@/lib/i18n/types"
import { inboundScanPath } from "@/lib/line/inbound-scan-url"
import { t } from "@/lib/i18n/translate"

type PageProps = {
  searchParams: Promise<{ order?: string; "liff.state"?: string; lang?: string }>
}

export default async function InboundScanPage({ searchParams }: PageProps) {
  const params = await searchParams
  const hasOrderHint = Boolean(params.order?.trim() || params["liff.state"]?.trim())

  const employee = await getCurrentEmployee()
  const lang = params.lang ?? employee?.preferred_locale
  const locale = coerceLocale(lang)

  if (!employee) {
    const loginParams = new URLSearchParams({
      lang: locale,
      next: `/liff/inbound-scan?lang=${locale}`,
    })
    redirect(`/login?${loginParams.toString()}`)
  }

  // Redirect non-inventory users back to LIFF Home
  if (!canAccessPortalInventoryWorkspace(employee)) {
    redirect(`/liff/home?lang=${locale}`)
  }

  // If there's an order hint, show original scanning interface
  if (hasOrderHint) {
    return (
      <LiffPageShell
        title="สแกนรับเข้า"
        subtitle="เปิดใบรับเข้าที่ต้องการ แล้วสแกนของต่อได้ทันที"
        backHref={`/liff/home?lang=${locale}`}
      >
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Suspense
            fallback={
              <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm">
                กำลังโหลดใบรับเข้า…
              </div>
            }
          >
            <InboundScanPageContent />
          </Suspense>
        </div>
      </LiffPageShell>
    )
  }

  // Otherwise, list all pending inbound orders
  let orders: Awaited<ReturnType<typeof listInvInboundOrders>> = []
  try {
    orders = await listInvInboundOrders({ status: "pending" })
  } catch (err) {
    console.error("Failed to load inbound orders:", err)
  }

  const tx = (key: Parameters<typeof t>[0], vars?: Parameters<typeof t>[2]) =>
    t(key, locale, vars)

  return (
    <LiffPageShell
      title={tx("portal.home.shortcutInbound")}
      subtitle="เลือกใบรับเข้าที่ต้องการสแกนสินค้า"
      backHref={`/liff/home?lang=${locale}`}
    >
      <div className="flex flex-1 flex-col gap-3 p-4 bg-[#F5F5F5]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            ใบรับเข้าค้างสแกน ({orders.length})
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <span className="inline-block text-4xl mb-3">📦</span>
            <p className="text-sm font-semibold text-gray-900">ไม่มีใบรับเข้าที่ค้างอยู่</p>
            <p className="mt-1 text-xs text-gray-400">
              ขณะนี้ไม่มีใบรับเข้าสินค้าสถานะรอดำเนินการ (Pending)
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const scanUrl = inboundScanPath(order.id, locale)
              return (
                <Link
                  key={order.id}
                  href={scanUrl}
                  className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm active:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-xl">
                        🚚
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {order.supplier_name}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          คลัง: {order.warehouse_name}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                            {order.item_count} รายการ
                          </span>
                          {order.notes && (
                            <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                              {order.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-300 font-medium">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </LiffPageShell>
  )
}

