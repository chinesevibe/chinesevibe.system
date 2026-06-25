import Link from "next/link"

import { MobileShell } from "@/components/mobile/MobileShell"
import { listInvInboundOrders, INBOUND_STATUS_LABELS } from "@/features/inventory/inbound-data"

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
    year: "2-digit",
  })
}

export default async function MobileInboundListPage() {
  let orders: Awaited<ReturnType<typeof listInvInboundOrders>> = []
  try {
    orders = await listInvInboundOrders({ status: "pending" })
  } catch (err) {
    console.error("Failed to load inbound orders:", err)
  }

  return (
    <MobileShell variant="back" title="รับเข้าสินค้า" activeTab="inbound">
      <div className="flex flex-col gap-3 p-4">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#16181d]/50">
            ใบรับเข้าค้าง ({orders.length})
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-[#eceef1] bg-white px-4 py-12 text-center shadow-sm">
            <span className="text-5xl">🚚</span>
            <p className="mt-4 text-sm font-semibold text-[#16181d]">ไม่มีใบรับเข้าค้าง</p>
            <p className="mt-1 text-xs text-gray-400">
              ทุกใบรับเข้าสถานะ Pending ถูกดำเนินการครบแล้ว
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => {
              const style = STATUS_STYLES[order.status] ?? STATUS_STYLES.draft
              return (
                <Link
                  key={order.id}
                  href={`/m/inventory/inbound/${order.id}`}
                  className="block rounded-2xl border border-[#eceef1] bg-white p-4 shadow-sm active:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#16181d] truncate">
                        {order.supplier_name}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 truncate">
                        📦 {order.warehouse_name}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {INBOUND_STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3 border-t border-[#eceef1] pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-400">รายการ</span>
                      <span className="text-xs font-semibold text-[#16181d]">
                        {order.item_count}
                      </span>
                    </div>
                    {order.notes && (
                      <span className="flex-1 truncate rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                        📝 {order.notes}
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-gray-400">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </MobileShell>
  )
}
