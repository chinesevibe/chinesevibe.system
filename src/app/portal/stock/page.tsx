import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, Barcode, Package, Warehouse } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { StatusPill } from "@/components/brand/StatusPill"
import { buttonVariants } from "@/components/ui/button"
import { getInventoryFilterOptions } from "@/features/inventory/expansion-data"
import { invInputClass } from "@/features/inventory/form-styles"
import { listInvStockRows } from "@/features/inventory/stock-data"
import { canAccessPortalInventoryWorkspace, canManageInventory } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { cn } from "@/lib/utils"

type PageProps = {
  searchParams?: Promise<{
    search?: string
    view?: string
    branch_id?: string
    warehouse_id?: string
  }>
}

function asUuid(value?: string) {
  const trimmed = value?.trim() ?? ""
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : ""
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

export default async function PortalStockPage({ searchParams }: PageProps) {
  const employee = await getCurrentEmployee()
  if (!employee || !canAccessPortalInventoryWorkspace(employee)) {
    redirect("/portal")
  }

  const params = await searchParams
  const search = params?.search?.trim() ?? ""
  const view = params?.view === "below-min" || params?.view === "zero" ? params.view : "all"
  const branchId = asUuid(params?.branch_id)
  const warehouseId = asUuid(params?.warehouse_id)

  let loadError: string | null = null
  let rows: Awaited<ReturnType<typeof listInvStockRows>> = []
  let filterOptions: Awaited<ReturnType<typeof getInventoryFilterOptions>> = {
    branches: [],
    warehouses: [],
  }

  try {
    ;[rows, filterOptions] = await Promise.all([
      listInvStockRows({
        search,
        branchId: branchId || undefined,
        warehouseId: warehouseId || undefined,
        belowMinOnly: view === "below-min",
      }),
      getInventoryFilterOptions(),
    ])
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูลสต็อกไม่สำเร็จ"
  }

  const filteredWarehouses = branchId
    ? filterOptions.warehouses.filter((warehouse) => warehouse.branch_id === branchId)
    : filterOptions.warehouses

  const filteredRows = view === "zero" ? rows.filter((row) => row.quantity === 0) : rows
  const belowMinCount = rows.filter((row) => row.belowMin).length
  const zeroCount = rows.filter((row) => row.quantity === 0).length
  const visibleBelowMinCount = filteredRows.filter((row) => row.belowMin).length
  const visibleZeroCount = filteredRows.filter((row) => row.quantity === 0).length
  const normalCount = filteredRows.length - visibleBelowMinCount - visibleZeroCount
  const warehouseCount = new Set(filteredRows.map((row) => row.warehouseCode)).size
  const branchCount = new Set(filteredRows.map((row) => row.branchName)).size

  function stockHref(nextView: "all" | "below-min" | "zero") {
    const query = new URLSearchParams()
    if (search) query.set("search", search)
    if (branchId) query.set("branch_id", branchId)
    if (warehouseId) query.set("warehouse_id", warehouseId)
    if (nextView !== "all") query.set("view", nextView)
    const value = query.toString()
    return value ? `/portal/stock?${value}` : "/portal/stock"
  }

  function statusMeta(row: (typeof rows)[number]) {
    if (row.quantity === 0) {
      return {
        label: "หมด",
        variant: "rejected" as const,
        tone: "text-red-700",
        cardTone: "border-red-200 bg-red-50/50",
      }
    }
    if (row.belowMin) {
      return {
        label: "ต่ำกว่าขั้นต่ำ",
        variant: "pending" as const,
        tone: "text-amber-700",
        cardTone: "border-amber-200 bg-amber-50/50",
      }
    }
    return {
      label: "ปกติ",
      variant: "approved" as const,
      tone: "text-emerald-700",
      cardTone: "border-emerald-200 bg-emerald-50/40",
    }
  }

  function stockGapCopy(row: (typeof rows)[number]) {
    if (row.quantity === 0 && row.minStock > 0) {
      return `ขาดอีก ${formatQuantity(row.minStock)} เพื่อกลับถึงขั้นต่ำ`
    }
    if (row.belowMin) {
      return `ขาดอีก ${formatQuantity(row.minStock - row.quantity)} เพื่อกลับถึงขั้นต่ำ`
    }
    if (row.minStock > 0) {
      return `สูงกว่าขั้นต่ำ ${formatQuantity(row.quantity - row.minStock)}`
    }
    return "รายการนี้ยังไม่ได้ตั้งขั้นต่ำ"
  }

  return (
    <AdminPageShell
      title="เช็คสต็อก"
      description={
        belowMinCount > 0
          ? `ค้นหาสต็อกหน้างาน · ${belowMinCount} รายการต่ำกว่าขั้นต่ำ`
          : "ค้นหาสต็อกตามสินค้า บาร์โค้ด สาขา และคลัง"
      }
    >
      <PortalInventoryTaskNav
        current="stock"
        showManagerLinks={canManageInventory(employee)}
      />

      <form action="/portal/stock" className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold">ค้นหาสต็อก</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ค้นด้วยรหัสสินค้า ชื่อสินค้า บาร์โค้ด หรือชื่อคลัง
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="search"
              defaultValue={search}
              placeholder="เช่น BEV, น้ำปลา, 885..."
              className={invInputClass}
            />
            <div className="flex gap-2">
              <button className={cn(buttonVariants({ variant: "secondary", size: "sm" }))} type="submit">
                ค้นหา
              </button>
              {search || view !== "all" || branchId || warehouseId ? (
                <Link
                  href="/portal/stock"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  ล้าง
                </Link>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select name="branch_id" defaultValue={branchId} className={invInputClass}>
              <option value="">ทุกสาขา</option>
              {filterOptions.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <select name="warehouse_id" defaultValue={warehouseId} className={invInputClass}>
              <option value="">ทุกคลัง</option>
              {filteredWarehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
          {view !== "all" ? <input type="hidden" name="view" value={view} /> : null}
          <div className="flex flex-wrap gap-2">
            <Link
              href={stockHref("all")}
              className={cn(
                buttonVariants({ variant: view === "all" ? "default" : "outline", size: "sm" })
              )}
            >
              ทั้งหมด
            </Link>
            <Link
              href={stockHref("below-min")}
              className={cn(
                buttonVariants({ variant: view === "below-min" ? "default" : "outline", size: "sm" })
              )}
            >
              ต่ำกว่าขั้นต่ำ
            </Link>
            <Link
              href={stockHref("zero")}
              className={cn(
                buttonVariants({ variant: view === "zero" ? "default" : "outline", size: "sm" })
              )}
            >
              หมดสต็อก
            </Link>
          </div>
        </div>
      </form>

      {loadError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      {filteredRows.length > 0 ? (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-border/80 bg-card px-3 py-3 shadow-sm">
            <p className="text-[11px] text-muted-foreground">แสดงอยู่</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{filteredRows.length}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-card px-3 py-3 shadow-sm">
            <p className="text-[11px] text-muted-foreground">คลังที่พบ</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{warehouseCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 shadow-sm">
            <p className="text-[11px] text-amber-700">ต่ำกว่าขั้นต่ำ</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-amber-800">
              {belowMinCount}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/70 px-3 py-3 shadow-sm">
            <p className="text-[11px] text-red-700">หมด</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-red-800">
              {zeroCount}
            </p>
          </div>
        </section>
      ) : null}

      {filteredRows.length > 0 ? (
        <div className="rounded-xl border border-border/70 bg-muted/15 p-3 text-sm text-muted-foreground">
          {search ? `ผลค้นหา "${search}" · ` : ""}
          {branchId ? `กรองสาขา · ` : ""}
          {warehouseId ? `กรองคลัง · ` : ""}
          {branchCount} สาขา · {warehouseCount} คลัง
          {view === "below-min" ? " · กรองเฉพาะต่ำกว่าขั้นต่ำ" : null}
          {view === "zero" ? " · กรองเฉพาะหมดสต็อก" : null}
        </div>
      ) : null}

      {belowMinCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              มี {visibleBelowMinCount} รายการที่ต่ำกว่าขั้นต่ำ
              {visibleZeroCount > 0 ? ` และ ${visibleZeroCount} รายการหมดสต็อก` : ""}
              {normalCount > 0 ? ` · ปกติ ${normalCount} รายการ` : ""}
            </p>
            <Link
              href="/portal/inbound"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "border-amber-300 bg-white/80 text-amber-900")}
            >
              ไปงานรับเข้า
            </Link>
          </div>
        </div>
      ) : null}

      {filteredRows.length === 0 && !loadError ? (
        <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-10 text-center">
          <Package className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            {search || view !== "all" || branchId || warehouseId ? "ไม่พบรายการที่ตรงกับตัวกรอง" : "ยังไม่มีข้อมูลสต็อก"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || view !== "all" || branchId || warehouseId
              ? "ลองล้างคำค้นหรือสลับมุมมองแล้วค้นหาใหม่"
              : "ติดต่อทีมคลังเมื่อมีสินค้ารับเข้า"}
          </p>
        </div>
      ) : null}

      {filteredRows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filteredRows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              {(() => {
                const meta = statusMeta(row)
                return (
                  <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {row.skuCode}
                  </p>
                  <p className="mt-1 text-base font-semibold leading-tight">{row.skuName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!row.isActive ? (
                    <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      ปิดใช้งาน
                    </span>
                  ) : null}
                  <StatusPill label={meta.label} variant={meta.variant} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={`rounded-xl border px-3 py-3 ${meta.cardTone}`}>
                  <p className="text-[11px] text-muted-foreground">คงเหลือจริง</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${meta.tone}`}>
                    {formatQuantity(row.quantity)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
                  <p className="text-[11px] text-muted-foreground">ขั้นต่ำ</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {row.minStock > 0 ? formatQuantity(row.minStock) : "—"}
                  </p>
                </div>
              </div>

              <div className={cn("mt-3 rounded-xl border px-3 py-2 text-sm", meta.cardTone)}>
                <p className="font-medium">{stockGapCopy(row)}</p>
              </div>

              <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-muted/15 p-3">
                <div className="flex items-start gap-2 text-sm">
                  <Warehouse className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium">{row.branchName}</p>
                    <p className="text-muted-foreground">
                      {row.warehouseCode} · {row.warehouseName}
                    </p>
                  </div>
                </div>

                {row.barcode ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Barcode className="size-3.5 shrink-0" />
                    <span className="truncate">{row.barcode}</span>
                  </div>
                ) : null}
              </div>
                  </>
                )
              })()}
            </li>
          ))}
        </ul>
      ) : null}
    </AdminPageShell>
  )
}
