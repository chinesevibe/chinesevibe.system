import { notFound } from "next/navigation"

import { MobileShell } from "@/components/mobile/MobileShell"
import { getTransferDetail } from "@/features/inventory/actions/transfer"

const RED = "#E11D2A"

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft:      { bg: "#f3f4f6", text: "#6b7280",  label: "แบบร่าง" },
  in_transit: { bg: "#fef9c3", text: "#854d0e",  label: "กำลังโอน" },
  received:   { bg: "#dcfce7", text: "#15803d",  label: "เสร็จสิ้น" },
  cancelled:  { bg: "#fee2e2", text: RED,         label: "ยกเลิก" },
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
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

export default async function MobileTransferDetailPage({ params }: PageProps) {
  const { id } = await params

  let detail = null
  try {
    detail = await getTransferDetail(id)
  } catch (err) {
    console.error("Failed to load transfer detail:", err)
  }

  if (!detail) notFound()

  const { transfer, sent_by_name, received_by_name, items } = detail
  const statusStyle = STATUS_STYLES[transfer.status] ?? STATUS_STYLES.draft

  return (
    <MobileShell
      variant="back"
      title={`ใบโอน #${id.slice(0, 8).toUpperCase()}`}
      activeTab="menu"
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Header Card */}
        <div className="rounded-2xl border border-[#eceef1] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              ข้อมูลการโอน
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: statusStyle.bg, color: statusStyle.text }}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* Visual Route */}
          <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-4 border border-[#eceef1]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-400">ต้นทาง</p>
              <p className="text-sm font-bold text-[#16181d] truncate">
                {transfer.from_warehouse_name}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {transfer.from_branch_name}
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-center text-2xl text-gray-300">
              ➔
            </div>
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[10px] text-gray-400">ปลายทาง</p>
              <p className="text-sm font-bold text-[#16181d] truncate">
                {transfer.to_warehouse_name}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                {transfer.to_branch_name}
              </p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#eceef1] pt-4 text-xs">
            <div>
              <p className="text-[10px] text-gray-400">ผู้ส่ง</p>
              <p className="mt-0.5 font-semibold text-[#16181d]">
                {sent_by_name ?? "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">วันที่ส่ง</p>
              <p className="font-semibold text-[#16181d]">
                {formatDate(transfer.sent_at)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">ผู้รับ</p>
              <p className="mt-0.5 font-semibold text-[#16181d]">
                {received_by_name ?? "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">วันที่รับ</p>
              <p className="font-semibold text-[#16181d]">
                {formatDate(transfer.received_at)}
              </p>
            </div>
          </div>

          {/* Notes */}
          {transfer.notes && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 border border-amber-100">
              <span className="font-semibold">📝 หมายเหตุ:</span> {transfer.notes}
            </div>
          )}
        </div>

        {/* Items Section */}
        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              รายการสินค้า ({items.length})
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-[#eceef1] bg-white px-4 py-10 text-center shadow-sm">
              <p className="text-sm text-gray-400">ไม่มีรายการสินค้าในใบโอนนี้</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => {
                let statusText = "⏳ รอ"
                let statusBg = "#f3f4f6"
                let statusTextColor = "#6b7280"

                if (item.qty_received >= item.qty_sent) {
                  statusText = "✅ ครบ"
                  statusBg = "#dcfce7"
                  statusTextColor = "#15803d"
                } else if (item.qty_received === 0) {
                  statusText = "⏳ รอ"
                  statusBg = "#f3f4f6"
                  statusTextColor = "#6b7280"
                } else {
                  statusText = "⚠️ บางส่วน"
                  statusBg = "#fef9c3"
                  statusTextColor = "#854d0e"
                }

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-[#eceef1] bg-white p-4 shadow-sm"
                  >
                    {/* Top Row: Product Info & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-[#16181d] leading-snug truncate">
                          {item.sku_name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.sku_code}
                        </p>
                        {item.lot_number && (
                          <span className="inline-block mt-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                            ล็อต: {item.lot_number}
                          </span>
                        )}
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: statusBg, color: statusTextColor }}
                      >
                        {statusText}
                      </span>
                    </div>

                    {/* Bottom Row: Quantities Grid */}
                    <div className="grid grid-cols-2 gap-4 border-t border-[#eceef1] pt-3 text-center">
                      <div>
                        <p className="text-[10px] text-gray-400">ส่ง</p>
                        <p className="text-sm font-extrabold text-[#16181d] mt-0.5">
                          {item.qty_sent.toLocaleString("th-TH")}{" "}
                          <span className="text-[10px] font-normal text-gray-400">
                            {item.unit_abbreviation || item.unit_name || "ชิ้น"}
                          </span>
                        </p>
                      </div>
                      <div className="border-l border-[#eceef1]">
                        <p className="text-[10px] text-gray-400">รับ</p>
                        <p className="text-sm font-extrabold mt-0.5 text-[#16181d]">
                          {item.qty_received.toLocaleString("th-TH")}{" "}
                          <span className="text-[10px] font-normal text-gray-400">
                            {item.unit_abbreviation || item.unit_name || "ชิ้น"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </MobileShell>
  )
}
