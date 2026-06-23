import { redirect } from "next/navigation"
import { AlertTriangle, Barcode, Package, Warehouse } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { StatusPill } from "@/components/brand/StatusPill"
import { listInvStockRows } from "@/features/inventory/stock-data"
import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function PortalStockPage() {
  const employee = await getCurrentEmployee()
  if (!employee || !canAccessPortalInventoryWorkspace(employee)) {
    redirect("/portal")
  }

  let loadError: string | null = null
  let rows: Awaited<ReturnType<typeof listInvStockRows>> = []

  try {
    rows = await listInvStockRows()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูลสต็อกไม่สำเร็จ"
  }

  const belowMinCount = rows.filter((row) => row.belowMin).length
  const zeroCount = rows.filter((row) => row.quantity === 0).length
  const normalCount = rows.length - belowMinCount - zeroCount

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
        label: "ต่ำกว่า Min",
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

  return (
    <AdminPageShell
      title="เช็คสต็อก"
      description={
        belowMinCount > 0
          ? `ยอดคงเหลือทุกคลัง · ${belowMinCount} รายการต่ำกว่า Min`
          : "ยอดคงเหลือทุกคลัง — อัปเดตจากระบบคลัง"
      }
    >
      {loadError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <section className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border/80 bg-card px-3 py-3 shadow-sm">
            <p className="text-[11px] text-muted-foreground">ทั้งหมด</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 shadow-sm">
            <p className="text-[11px] text-amber-700">ต่ำกว่า Min</p>
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

      {belowMinCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            มี {belowMinCount} รายการที่ต่ำกว่า Min
            {zeroCount > 0 ? ` และ ${zeroCount} รายการหมดสต็อก` : ""}
            {normalCount > 0 ? ` · ปกติ ${normalCount} รายการ` : ""}
          </p>
        </div>
      ) : null}

      {rows.length === 0 && !loadError ? (
        <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-10 text-center">
          <Package className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">ยังไม่มีข้อมูลสต็อก</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ติดต่อทีมคลังเมื่อมีสินค้ารับเข้า
          </p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {row.skuCode}
                  </p>
                  <p className="mt-1 text-base font-semibold leading-tight">{row.skuName}</p>
                </div>
                <StatusPill
                  label={statusMeta(row).label}
                  variant={statusMeta(row).variant}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={`rounded-xl border px-3 py-3 ${statusMeta(row).cardTone}`}>
                  <p className="text-[11px] text-muted-foreground">คงเหลือ</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${statusMeta(row).tone}`}>
                    {row.quantity}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
                  <p className="text-[11px] text-muted-foreground">Min</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {row.minStock > 0 ? row.minStock : "—"}
                  </p>
                </div>
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
            </li>
          ))}
        </ul>
      ) : null}
    </AdminPageShell>
  )
}
