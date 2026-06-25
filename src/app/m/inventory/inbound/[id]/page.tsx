import Link from "next/link"
import { notFound } from "next/navigation"

import { MobileShell } from "@/components/mobile/MobileShell"
import {
  getInvInboundOrderDetail,
  INBOUND_STATUS_LABELS,
} from "@/features/inventory/inbound-data"

const RED = "#E11D2A"

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending:   { bg: "#dcfce7", text: "#15803d" },
  draft:     { bg: "#f3f4f6", text: "#6b7280" },
  approved:  { bg: "#dbeafe", text: "#1d4ed8" },
  cancelled: { bg: "#fee2e2", text: RED },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MobileInboundDetailPage({ params }: PageProps) {
  const { id } = await params

  let detail: Awaited<ReturnType<typeof getInvInboundOrderDetail>> = null
  try {
    detail = await getInvInboundOrderDetail(id)
  } catch (err) {
    console.error("Failed to load inbound order detail:", err)
  }

  if (!detail) notFound()

  const { order, supplier_name, warehouse_name, items } = detail
  const statusStyle = STATUS_STYLES[order.status] ?? STATUS_STYLES.draft
  const shortRef = id.slice(0, 8).toUpperCase()
  const isPending = order.status === "pending"

  return (
    <MobileShell
      variant="back"
      title={`ใบรับเข้า #${shortRef}`}
      activeTab="inbound"
    >
      <div className="flex flex-col gap-4 p-4">

        {/* Order header card */}
        <div className="rounded-2xl border border-[#eceef1] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400 mb-1">ผู้จำหน่าย</p>
              <p className="text-base font-bold text-[#16181d]">{supplier_name}</p>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: statusStyle.bg, color: statusStyle.text }}
            >
              {INBOUND_STATUS_LABELS[order.status]}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#eceef1] pt-3">
            <div>
              <p className="text-[10px] text-gray-400">คลังปลายทาง</p>
              <p className="mt-0.5 text-xs font-semibold text-[#16181d]">{warehouse_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">วันที่สร้าง</p>
              <p className="mt-0.5 text-xs font-semibold text-[#16181d]">
                {formatDate(order.created_at)}
              </p>
            </div>
            {order.received_date && (
              <div>
                <p className="text-[10px] text-gray-400">วันที่รับ</p>
                <p className="mt-0.5 text-xs font-semibold text-[#16181d]">
                  {formatDate(order.received_date)}
                </p>
              </div>
            )}
          </div>

          {order.notes && (
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              📝 {order.notes}
            </div>
          )}
        </div>

        {/* Items list */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#16181d]/50">
            รายการสินค้า ({items.length})
          </p>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-[#eceef1] bg-white px-4 py-8 text-center">
              <p className="text-sm text-gray-400">ยังไม่มีรายการสินค้าในใบนี้</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-[#eceef1] bg-white p-3 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-xl">
                    📦
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#16181d] truncate">
                      {item.sku_name}
                    </p>
                    <p className="text-xs text-gray-400">{item.sku_code}</p>
                    {item.lot_number && (
                      <p className="text-[10px] text-gray-400">ล็อต: {item.lot_number}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-[#16181d]">
                      {item.quantity.toLocaleString("th-TH")}
                    </p>
                    <p className="text-[10px] text-gray-400">จำนวน</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Scan button — only when pending */}
        {isPending && (
          <div className="mt-2">
            <Link
              href={`/liff/inbound-scan?order=${id}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-lg active:opacity-90 transition"
              style={{ background: `linear-gradient(135deg, ${RED} 0%, #c41825 100%)` }}
            >
              <span className="text-lg">🔍</span>
              สแกนรับเข้า
            </Link>
            <p className="mt-2 text-center text-xs text-gray-400">
              เปิด LIFF scanner เพื่อสแกนสินค้าในใบนี้
            </p>
          </div>
        )}
      </div>
    </MobileShell>
  )
}
