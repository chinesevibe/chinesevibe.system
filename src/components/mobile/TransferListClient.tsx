"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { InvTransferRow } from "@/features/inventory/actions/transfer"

const RED = "#E11D2A"

type Filter = "all" | "in_transit" | "received" | "draft" | "cancelled"

const FILTER_LABELS: Record<Filter, string> = {
  all: "ทั้งหมด",
  in_transit: "กำลังโอน",
  received: "เสร็จสิ้น",
  draft: "แบบร่าง",
  cancelled: "ยกเลิก",
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft:      { bg: "#f3f4f6", text: "#6b7280",  label: "แบบร่าง" },
  in_transit: { bg: "#fef9c3", text: "#854d0e",  label: "กำลังโอน" },
  received:   { bg: "#dcfce7", text: "#15803d",  label: "เสร็จสิ้น" },
  cancelled:  { bg: "#fee2e2", text: RED,         label: "ยกเลิก" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  })
}

interface TransferListClientProps {
  transfers: InvTransferRow[]
}

export function TransferListClient({ transfers }: TransferListClientProps) {
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    if (filter === "all") return transfers
    return transfers.filter((t) => t.status === filter)
  }, [transfers, filter])

  const chips: Filter[] = ["all", "in_transit", "received", "draft"]

  return (
    <>
      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-4 scrollbar-none">
        {chips.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition"
            style={
              filter === f
                ? { background: RED, color: "#fff", borderColor: RED }
                : { background: "#fff", color: "#6b7280", borderColor: "#eceef1" }
            }
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="px-4 pb-2">
        <p className="text-xs text-gray-400">
          แสดง {filtered.length} รายการ จาก {transfers.length}
        </p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-[#eceef1] bg-white px-4 py-12 text-center">
          <span className="text-5xl">🔄</span>
          <p className="mt-4 text-sm font-semibold text-[#16181d]">ไม่พบรายการโอน</p>
          <p className="mt-1 text-xs text-gray-400">ลองเปลี่ยน filter หรือสร้างรายการใหม่</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-24">
          {filtered.map((transfer) => {
            const style = STATUS_STYLES[transfer.status] ?? STATUS_STYLES.draft
            return (
              <Link
                key={transfer.id}
                href={`/m/inventory/transfer/${transfer.id}`}
                className="block rounded-2xl border border-[#eceef1] bg-white p-4 shadow-sm active:bg-gray-50 transition"
              >
                {/* Route line */}
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400">จาก</p>
                    <p className="text-xs font-semibold text-[#16181d] truncate">
                      {transfer.from_warehouse_name}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {transfer.from_branch_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-gray-300">
                    <span className="text-lg">→</span>
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-[10px] text-gray-400">ถึง</p>
                    <p className="text-xs font-semibold text-[#16181d] truncate">
                      {transfer.to_warehouse_name}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {transfer.to_branch_name}
                    </p>
                  </div>
                </div>

                {/* Footer row */}
                <div className="mt-3 flex items-center justify-between border-t border-[#eceef1] pt-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {transfer.item_count} รายการ
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {formatDate(transfer.created_at)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* FAB */}
      <Link
        href="/portal/transfer/create"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white text-2xl shadow-xl active:scale-95 transition-transform"
        style={{ background: `linear-gradient(135deg, ${RED} 0%, #c41825 100%)` }}
        title="สร้างใบโอนใหม่"
      >
        +
      </Link>
    </>
  )
}
