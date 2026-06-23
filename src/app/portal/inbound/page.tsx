import { redirect } from "next/navigation"
import { Barcode, ExternalLink } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { listInvInboundOrders } from "@/features/inventory/inbound-data"
import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { t } from "@/lib/i18n/translate"
import { inboundScanHref } from "@/lib/line/inbound-scan-url"
import { cn } from "@/lib/utils"

export default async function PortalInboundPage() {
  const employee = await getCurrentEmployee()
  if (!employee || !canAccessPortalInventoryWorkspace(employee)) {
    redirect("/portal")
  }
  const locale = employee.preferred_locale

  let loadError: string | null = null
  let orders: Awaited<ReturnType<typeof listInvInboundOrders>> = []

  try {
    orders = await listInvInboundOrders({ status: "pending" })
  } catch (error) {
    loadError = error instanceof Error ? error.message : t("liff.inbound.errorLoad", locale)
  }

  return (
    <AdminPageShell
      title={t("line.inventoryGuide.title", locale)}
      description={t("line.inventoryGuide.descReady", locale)}
    >
      {loadError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      {!loadError ? (
        <div className="mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">งานรับเข้าที่พร้อมสแกน</p>
              <p className="mt-1 text-sm text-muted-foreground">
                เลือกใบรับ → เปิดสแกนใน LINE → ยิง barcode ของจริงเข้า order นั้นทันที
              </p>
            </div>
            <div className="rounded-xl bg-muted/30 px-3 py-2 text-right">
              <p className="text-[11px] text-muted-foreground">พร้อมสแกน</p>
              <p className="text-lg font-semibold tabular-nums">{orders.length}</p>
            </div>
          </div>
        </div>
      ) : null}

      {orders.length === 0 && !loadError ? (
        <div className="rounded-xl border border-border/80 bg-muted/20 px-4 py-10 text-center">
          <Barcode className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">{t("liff.inbound.noOrders", locale)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("liff.inbound.noOrdersDesc", locale)}
          </p>
        </div>
      ) : null}

      {orders.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {order.supplier_name} → {order.warehouse_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("liff.inbound.orderCreated", locale, {
                    date: formatThaiDate(order.created_at),
                  })}
                  {order.item_count > 0
                    ? ` · ${t("liff.inbound.orderItemCount", locale, {
                        count: order.item_count,
                      })}`
                    : ` · ${t("liff.inbound.orderNoItems", locale)}`}
                </p>
                {order.notes ? (
                  <p className="text-xs text-muted-foreground">{order.notes}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2">
                <div className="rounded-lg bg-muted/30 px-3 py-2 text-right">
                  <p className="text-[11px] text-muted-foreground">จำนวนรายการ</p>
                  <p className="text-sm font-semibold tabular-nums">{order.item_count}</p>
                </div>
                <a
                  href={inboundScanHref(order.id, locale)}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "inline-flex items-center justify-center gap-1.5"
                  )}
                >
                  {t("liff.inbound.scanTab", locale)}
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </AdminPageShell>
  )
}
