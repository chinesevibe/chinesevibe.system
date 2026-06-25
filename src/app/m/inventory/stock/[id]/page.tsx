import { notFound, redirect } from "next/navigation"

import { MobileShell } from "@/components/mobile/MobileShell"
import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

const RED = "#E11D2A"

const MOVEMENT_LABELS: Record<string, string> = {
  inbound: "รับเข้า",
  consumption: "เบิกใช้",
  damage: "เสียหาย",
  transfer_in: "รับโอน",
  transfer_out: "โอนออก",
  adjustment: "ปรับสต็อก",
  stock_count: "นับสต็อก",
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`
  return `${Math.floor(hrs / 24)} วันที่แล้ว`
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MobileStockDetailPage({ params }: PageProps) {
  const { id } = await params

  const employee = await getCurrentEmployee()
  if (!employee) redirect(`/login?next=/m/inventory/stock/${id}`)
  if (!canAccessPortalInventoryWorkspace(employee)) redirect("/portal")

  const supabase = await createClient()

  // Fetch stock balance with SKU + warehouse details
  const { data: balance, error: balanceError } = await supabase
    .from("inv_stock_balances")
    .select(`
      id,
      sku_id,
      quantity,
      warehouse_id,
      inv_skus!inner(
        code,
        name,
        min_stock,
        barcode,
        is_active,
        category,
        inv_units(name, abbreviation)
      ),
      inv_warehouses!inner(
        code,
        name,
        branch_id,
        inv_branches(name)
      )
    `)
    .eq("id", id)
    .maybeSingle()

  if (balanceError) {
    console.error("Stock balance error:", balanceError)
  }

  if (!balance) notFound()

  // Fetch recent movements for this SKU
  const skuRaw = balance.inv_skus as unknown
  const skuJoined = Array.isArray(skuRaw) ? skuRaw[0] : skuRaw
  const sku = skuJoined as {
    code: string
    name: string
    min_stock: number
    barcode: string | null
    is_active: boolean
    category: string | null
    inv_units: unknown
  }

  const whRaw = balance.inv_warehouses as unknown
  const whJoined = Array.isArray(whRaw) ? whRaw[0] : whRaw
  const warehouse = whJoined as {
    code: string
    name: string
    branch_id: string
    inv_branches: unknown
  }

  const unitRaw = sku.inv_units as unknown
  const unitJoined = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw
  const unit = unitJoined as { name?: string; abbreviation?: string } | null

  function branchName(raw: unknown): string {
    if (!raw) return "—"
    if (Array.isArray(raw)) return (raw[0] as { name?: string })?.name ?? "—"
    return (raw as { name?: string }).name ?? "—"
  }

  const quantity = Number(balance.quantity)
  const minStock = Number(sku.min_stock)
  const belowMin = minStock > 0 && quantity < minStock

  const { data: movements } = await supabase
    .from("inv_stock_movements")
    .select("id, movement_type, quantity, created_at, reference_type, notes")
    .eq("sku_id", balance.sku_id as string)
    .order("created_at", { ascending: false })
    .limit(10)

  const statusLabel = quantity === 0 ? "หมดสต็อก" : belowMin ? "ต่ำกว่าขั้นต่ำ" : "ปกติ"
  const statusColor =
    quantity === 0
      ? { bg: "#fee2e2", text: RED }
      : belowMin
        ? { bg: "#fef9c3", text: "#854d0e" }
        : { bg: "#dcfce7", text: "#15803d" }

  return (
    <MobileShell variant="back" title={sku.name} activeTab="stock">
      <div className="flex flex-col gap-4 p-4">

        {/* SKU Identity Card */}
        <div className="rounded-2xl border border-[#eceef1] bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-3xl">
              📦
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold text-[#16181d] leading-tight">{sku.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">รหัส: {sku.code}</p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: statusColor.bg, color: statusColor.text }}
                >
                  {statusLabel}
                </span>
              </div>
              {sku.barcode && (
                <p className="mt-1.5 text-xs text-gray-400">
                  บาร์โค้ด: <span className="font-mono">{sku.barcode}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="คงเหลือปัจจุบัน"
            value={quantity.toLocaleString("th-TH")}
            unit={unit?.abbreviation ?? unit?.name}
            highlight
            danger={belowMin || quantity === 0}
          />
          <StatCard
            label="จุดสั่งซื้อ (ขั้นต่ำ)"
            value={minStock.toLocaleString("th-TH")}
            unit={unit?.abbreviation ?? unit?.name}
          />
        </div>

        {/* Metadata table */}
        <div className="rounded-2xl border border-[#eceef1] bg-white shadow-sm overflow-hidden">
          <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#16181d]/50 border-b border-[#eceef1]">
            ข้อมูลทั่วไป
          </p>
          <div className="divide-y divide-[#eceef1]">
            <MetaRow label="หมวดหมู่" value={sku.category ?? "—"} />
            <MetaRow label="หน่วย" value={unit ? (unit.abbreviation ? `${unit.name} (${unit.abbreviation})` : (unit.name ?? "—")) : "—"} />
            <MetaRow label="คลัง" value={warehouse.name} />
            <MetaRow label="สาขา" value={branchName(warehouse.inv_branches)} />
          </div>
        </div>

        {/* Movement History */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#16181d]/50 mb-2">
            ประวัติการเคลื่อนไหว (10 รายการล่าสุด)
          </p>

          {!movements || movements.length === 0 ? (
            <div className="rounded-2xl border border-[#eceef1] bg-white px-4 py-8 text-center">
              <p className="text-sm text-gray-400">ยังไม่มีประวัติ</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {movements.map((mov) => {
                const qty = Number(mov.quantity)
                const isPositive = ["inbound", "transfer_in", "adjustment"].includes(
                  mov.movement_type as string
                )
                const label =
                  MOVEMENT_LABELS[mov.movement_type as string] ?? mov.movement_type
                const refLabel = mov.reference_type
                  ? ` · ${mov.reference_type}`
                  : ""

                return (
                  <div
                    key={mov.id}
                    className="flex items-center gap-3 rounded-xl border border-[#eceef1] bg-white p-3 shadow-sm"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                      style={{
                        background: isPositive ? "#dcfce7" : "#fee2e2",
                        color: isPositive ? "#15803d" : RED,
                      }}
                    >
                      {isPositive ? "+" : "−"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#16181d]">
                        {label}
                        <span className="text-xs text-gray-400">{refLabel}</span>
                      </p>
                      {mov.notes && (
                        <p className="text-xs text-gray-400 truncate">{mov.notes as string}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className="text-sm font-bold"
                        style={{ color: isPositive ? "#15803d" : RED }}
                      >
                        {isPositive ? "+" : "−"}{Math.abs(qty)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatRelative(mov.created_at as string)}
                      </p>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit,
  highlight = false,
  danger = false,
}: {
  label: string
  value: string
  unit?: string
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <div className="rounded-2xl border border-[#eceef1] bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p
        className="text-2xl font-bold"
        style={{
          color: highlight && danger ? RED : highlight ? "#16181d" : "#374151",
        }}
      >
        {value}
      </p>
      {unit && <p className="text-xs text-gray-400 mt-0.5">{unit}</p>}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-[#16181d]">{value}</p>
    </div>
  )
}
