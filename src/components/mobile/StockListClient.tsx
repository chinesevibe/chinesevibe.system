"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { InvStockRow } from "@/features/inventory/stock-data"

const RED = "#E11D2A"

type Filter = "all" | "below_min" | "empty"

interface StockListClientProps {
  rows: InvStockRow[]
}

export function StockListClient({ rows }: StockListClientProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === "below_min" && !row.belowMin) return false
      if (filter === "empty" && row.quantity > 0) return false
      if (q) {
        const hay = `${row.skuCode} ${row.skuName} ${row.warehouseName} ${row.branchName}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, search, filter])

  return (
    <>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา SKU, ชื่อ, คลัง…"
            className="w-full rounded-xl border border-[#eceef1] bg-white py-2.5 pl-9 pr-4 text-sm text-[#16181d] placeholder-gray-400 shadow-sm outline-none focus:border-[#E11D2A]/40 focus:ring-2 focus:ring-[#E11D2A]/10"
          />
        </div>
        <Link
          href="/liff/inbound-scan"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#eceef1] shadow-sm active:bg-gray-50"
          style={{ color: RED }}
        >
          <BarcodeIcon />
        </Link>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
        {(["all", "below_min", "empty"] as Filter[]).map((f) => (
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
            {{ all: "ทั้งหมด", below_min: "ต่ำกว่าขั้นต่ำ", empty: "หมดสต็อก" }[f]}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="px-4 pb-2">
        <p className="text-xs text-gray-400">
          แสดง {filtered.length} รายการ จาก {rows.length}
        </p>
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-[#eceef1] bg-white px-4 py-10 text-center">
          <span className="text-4xl">📦</span>
          <p className="mt-3 text-sm font-medium text-gray-500">ไม่พบรายการ</p>
          <p className="mt-1 text-xs text-gray-400">ลองเปลี่ยน filter หรือค้นหาใหม่</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 pb-4">
          {filtered.map((row) => (
            <Link
              key={row.id}
              href={`/m/inventory/stock/${row.id}`}
              className="flex items-center gap-3 rounded-2xl border border-[#eceef1] bg-white p-4 shadow-sm active:bg-gray-50 transition"
            >
              {/* Icon */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-2xl">
                📦
              </div>

              {/* Main info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[#16181d]">{row.skuName}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{row.skuCode}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  📍 {row.warehouseName} · {row.branchName}
                </p>
              </div>

              {/* Qty + badge */}
              <div className="shrink-0 text-right">
                <p className="text-base font-bold text-[#16181d]">{row.quantity}</p>
                <StockBadge row={row} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function StockBadge({ row }: { row: InvStockRow }) {
  if (row.quantity === 0) {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
        หมด
      </span>
    )
  }
  if (row.belowMin) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        ต่ำ
      </span>
    )
  }
  return (
    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
      ปกติ
    </span>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function BarcodeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="5" />
      <rect x="16" y="3" width="5" height="5" />
      <rect x="3" y="16" width="5" height="5" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
}
