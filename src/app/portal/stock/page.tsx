import { Package } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { StatusPill } from "@/components/brand/StatusPill"
import { listInvStockRows } from "@/features/inventory/stock-data"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function PortalStockPage() {
  const employee = await getCurrentEmployee()
  if (!employee) return null

  let loadError: string | null = null
  let rows: Awaited<ReturnType<typeof listInvStockRows>> = []

  try {
    rows = await listInvStockRows()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูลสต็อกไม่สำเร็จ"
  }

  const belowMinCount = rows.filter((row) => row.belowMin).length

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
            <li
              key={row.id}
              className="rounded-xl border border-border/80 bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">
                    {row.skuCode}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {row.skuName}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.branchName} · {row.warehouseName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="text-lg font-semibold tabular-nums">{row.quantity}</p>
                  {row.minStock > 0 ? (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Min {row.minStock}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                {row.quantity === 0 ? (
                  <StatusPill label="หมด" variant="rejected" />
                ) : row.belowMin ? (
                  <StatusPill label="ต่ำกว่า Min" variant="pending" />
                ) : (
                  <StatusPill label="ปกติ" variant="approved" />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </AdminPageShell>
  )
}
