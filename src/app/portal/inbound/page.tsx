import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertTriangle, Barcode, ExternalLink, PackageSearch, Truck } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { listInvInboundOrders } from "@/features/inventory/inbound-data"
import { canAccessPortalInventoryWorkspace, canManageInventory } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { t } from "@/lib/i18n/translate"
import { inboundScanHref, inboundScanPath } from "@/lib/line/inbound-scan-url"
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

  const actionableOrders = orders.filter((order) => order.item_count > 0)
  const emptyOrders = orders.filter((order) => order.item_count <= 0)

  return (
    <AdminPageShell
      title="รับเข้าสินค้า"
      description="เลือกใบรับที่พร้อมสแกน เปิดใน LINE แล้วรับเข้าตามของจริงจากมือถือ"
    >
      <PortalInventoryTaskNav
        current="inbound"
        showManagerLinks={canManageInventory(employee)}
      />

      {loadError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      {!loadError ? (
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">งานรับเข้าที่พร้อมสแกน</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  เลือกใบรับ → เปิดสแกนใน LINE → ยิงบาร์โค้ดของจริงเข้าใบรับนั้นทันที
                </p>
              </div>
              <div className="rounded-xl bg-muted/30 px-3 py-2 text-right">
                <p className="text-[11px] text-muted-foreground">พร้อมสแกน</p>
                <p className="text-lg font-semibold tabular-nums">{actionableOrders.length}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3">
                <p className="text-[11px] text-emerald-700">พร้อมสแกน</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-800">
                  {actionableOrders.length}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3">
                <p className="text-[11px] text-amber-700">ยังไม่มีรายการ</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-amber-800">
                  {emptyOrders.length}
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-3 sm:col-span-1 col-span-2">
                <p className="text-[11px] text-muted-foreground">ใบรับทั้งหมด</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{orders.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold">ขั้นตอนรับเข้าหน้างาน</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. เลือกใบรับที่มีรายการสินค้าแล้ว</li>
              <li>2. เช็คผู้จำหน่ายและคลังปลายทางให้ตรงของจริง</li>
              <li>3. เปิดสแกนใน LINE แล้วรับเข้าทีละชิ้นหรือทีละล็อต</li>
            </ul>
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

      {actionableOrders.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold">ใบรับที่เปิดสแกนได้ทันที</p>
            <p className="text-sm text-muted-foreground">
              แสดงเฉพาะใบที่มีรายการสินค้าแล้ว เพื่อลดการเปิดผิดขั้นตอน
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {actionableOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      ใบรับเข้า
                    </p>
                    <p className="mt-1 text-base font-semibold leading-tight">
                      {order.supplier_name}
                    </p>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                    พร้อมสแกน
                  </div>
                </div>

                <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-muted/15 p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium">{order.supplier_name}</p>
                      <p className="text-muted-foreground">ผู้จำหน่าย</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <PackageSearch className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium">{order.warehouse_name}</p>
                      <p className="text-muted-foreground">คลังปลายทาง</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted/30 px-2.5 py-1">
                    {t("liff.inbound.orderCreated", locale, {
                      date: formatThaiDate(order.created_at),
                    })}
                  </span>
                  <span className="rounded-full bg-muted/30 px-2.5 py-1">
                    {t("liff.inbound.orderItemCount", locale, {
                      count: order.item_count,
                    })}
                  </span>
                </div>

                {order.notes ? (
                  <div className="mt-3 rounded-xl border border-border/70 bg-muted/10 p-3 text-xs text-muted-foreground">
                    {order.notes}
                  </div>
                ) : null}

                <div className="mt-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href={inboundScanPath(order.id, locale)}
                      className={cn(
                        buttonVariants({ size: "sm" }),
                        "inline-flex flex-1 items-center justify-center gap-1.5"
                      )}
                    >
                      สแกนในหน้านี้
                    </Link>
                    <a
                      href={inboundScanHref(order.id, locale)}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "inline-flex flex-1 items-center justify-center gap-1.5"
                      )}
                    >
                      เปิดใน LINE
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {emptyOrders.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-sm font-semibold">ใบรับที่ยังสแกนไม่ได้</p>
            <p className="text-sm text-muted-foreground">
              ใบเหล่านี้ยังไม่มีรายการสินค้า ต้องเติมรายการก่อนเปิดสแกน
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {emptyOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {order.supplier_name} → {order.warehouse_name}
                    </p>
                    <p className="mt-1 text-sm text-amber-900/80">
                      {t("liff.inbound.orderCreated", locale, {
                        date: formatThaiDate(order.created_at),
                      })}
                    </p>
                  </div>
                  <div className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-xs font-medium text-amber-800">
                    ยังไม่มีรายการ
                  </div>
                </div>
                <div className="mt-3 flex items-start gap-2 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>ติดต่อทีมคลังหรือผู้สร้างใบรับให้เพิ่มรายการสินค้าก่อนเริ่มสแกน</p>
                </div>
                {order.notes ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-white/60 p-3 text-xs text-amber-900/80">
                    {order.notes}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {orders.length > 0 && actionableOrders.length === 0 && emptyOrders.length === 0 ? (
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
