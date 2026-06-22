import Link from "next/link"
import { notFound } from "next/navigation"
import { ClipboardList, PackagePlus, ScanLine, ShieldCheck } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { DataTableShell } from "@/components/brand/DataTableShell"
import { StatusPill } from "@/components/brand/StatusPill"
import { buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteInvInboundItem } from "@/features/inventory/actions/inbound"
import { getInvSkus, getInvUnits } from "@/features/inventory/actions/sku"
import {
  getInvInboundOrderDetail,
  INBOUND_STATUS_LABELS,
} from "@/features/inventory/inbound-data"
import {
  InboundAddItemForm,
  type InboundSkuUnitConfig,
} from "@/features/inventory/InboundAddItemForm"
import { InboundOrderActions } from "@/features/inventory/InboundOrderActions"
import { InventoryDeleteButton } from "@/features/inventory/InventoryDeleteButton"
import type { InvInboundStatus } from "@/features/inventory/types"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { inboundScanHref } from "@/lib/line/inbound-scan-url"
import { canAccessInventoryPortal, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { getSkuUnitOptions } from "@/lib/inventory/unit-conversion"
import { cn } from "@/lib/utils"

function statusVariant(status: InvInboundStatus) {
  if (status === "approved") return "approved" as const
  if (status === "pending") return "pending" as const
  return "neutral" as const
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

function unitLabel(unit?: { name: string; abbreviation: string | null } | null) {
  if (!unit) return ""
  return unit.abbreviation || unit.name
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof PackagePlus
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-brand-red">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function InboundOrderDetailPage({ params }: PageProps) {
  const employee = await requireInventoryPortal()
  const canManage = canAccessInventoryPortal(employee)
  const readOnly = isCeo(employee.role) && !isDev(employee.role)

  const { id } = await params
  const detail = await getInvInboundOrderDetail(id)
  if (!detail) notFound()

  const { order, supplier_name, warehouse_name, items } = detail
  const editable = canManage && (order.status === "draft" || order.status === "pending")
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  const [allSkus, units] = await Promise.all([getInvSkus(), getInvUnits()])
  const skus = editable ? allSkus.filter((s) => s.is_active) : []
  const unitsById = new Map(units.map((unit) => [unit.id, unit]))
  const skuBaseUnitsById = new Map(
    allSkus.map((sku) => [
      sku.id,
      sku.unit_id ? unitsById.get(sku.unit_id) ?? null : null,
    ])
  )

  let unitConfigs: Record<string, InboundSkuUnitConfig> = {}

  if (skus.length > 0) {
    const configs = await Promise.all(
      skus.map(async (sku) => {
        const fallbackBaseUnit = sku.unit_id ? unitsById.get(sku.unit_id) ?? null : null

        try {
          const options = await getSkuUnitOptions(sku.id)
          return [
            sku.id,
            {
              baseUnit:
                options.find((option) => option.isBaseUnit) ?? fallbackBaseUnit,
              options: options.map((option) => ({
                unit: {
                  id: option.id,
                  name: option.name,
                  abbreviation: option.abbreviation,
                },
                factorToBase: option.factorToBaseUnit,
              })),
            },
          ] as const
        } catch {
          return [
            sku.id,
            {
              baseUnit: fallbackBaseUnit,
              options: fallbackBaseUnit
                ? [{ unit: fallbackBaseUnit, factorToBase: 1 }]
                : [],
            },
          ] as const
        }
      })
    )
    unitConfigs = Object.fromEntries(configs)
  }

  return (
    <AdminPageShell
      title="รายละเอียดใบรับเข้า"
      description={`${supplier_name} → ${warehouse_name}`}
      action={
        <Link
          href="/admin/inventory/inbound"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          ← รายการ
        </Link>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="สถานะใบรับ"
          value={INBOUND_STATUS_LABELS[order.status]}
          hint="เปลี่ยนจากแบบร่าง → เปิดรับสแกน → อนุมัติแล้ว"
        />
        <SummaryCard
          icon={PackagePlus}
          label="รายการสินค้า"
          value={`${items.length.toLocaleString("th-TH")} รายการ`}
          hint={`ปริมาณรวม ${formatQuantity(totalQuantity)} หน่วยฐาน`}
        />
        <SummaryCard
          icon={ScanLine}
          label="Supplier / Warehouse"
          value={`${supplier_name} → ${warehouse_name}`}
          hint="ใช้ตรวจปลายทางของใบรับก่อนเปิด LIFF หรืออนุมัติ"
        />
        <SummaryCard
          icon={ShieldCheck}
          label="วันที่สำคัญ"
          value={
            order.received_date
              ? `รับเข้า ${formatThaiDate(order.received_date)}`
              : `สร้าง ${formatThaiDate(order.created_at)}`
          }
          hint="ใช้ดูจังหวะของเอกสารและวันรับเข้าจริง"
        />
      </div>

      <div className="mb-4 rounded-xl border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill
            label={INBOUND_STATUS_LABELS[order.status]}
            variant={statusVariant(order.status)}
          />
          <span className="text-sm text-muted-foreground">
            สร้าง {formatThaiDate(order.created_at)}
            {order.received_date
              ? ` · รับเข้า ${formatThaiDate(order.received_date)}`
              : ""}
          </span>
          <InboundOrderActions
            orderId={order.id}
            status={order.status}
            canManage={canManage && !readOnly}
          />
        </div>
        {order.notes ? (
          <p className="mt-3 text-sm text-muted-foreground">{order.notes}</p>
        ) : null}
        {order.status === "pending" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            เปิดรับสแกน — คลังสแกน barcode ได้ที่{" "}
            <a
              href={inboundScanHref(order.id)}
              className="font-medium text-brand-red underline"
              target="_blank"
              rel="noreferrer"
            >
              LIFF รับเข้า
            </a>
            {" "}หรือ Portal → คลังสินค้า · Inventory อนุมัติหลังตรวจรายการครบ
          </p>
        ) : null}
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">รายการในใบรับ</h2>
            <p className="text-xs text-muted-foreground">
              ตรวจรายการ หน่วยฐาน lot และวันหมดอายุก่อนสั่งอนุมัติ
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {items.length.toLocaleString("th-TH")} รายการ
          </div>
        </div>
        <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>ชื่อ</TableHead>
              <TableHead>จำนวน (หน่วยฐาน)</TableHead>
              <TableHead>Lot</TableHead>
              <TableHead>หมดอายุ</TableHead>
              {editable ? <TableHead className="text-right">ลบ</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku_code}</TableCell>
                  <TableCell>{item.sku_name}</TableCell>
                  <TableCell>
                    {formatQuantity(item.quantity)}
                    {unitLabel(skuBaseUnitsById.get(item.sku_id ?? ""))
                      ? ` ${unitLabel(skuBaseUnitsById.get(item.sku_id ?? ""))}`
                      : ""}
                  </TableCell>
                  <TableCell>{item.lot_number || "—"}</TableCell>
                  <TableCell>
                    {item.expiry_date ? formatThaiDate(item.expiry_date) : "—"}
                  </TableCell>
                  {editable ? (
                    <TableCell className="text-right">
                      <InventoryDeleteButton
                        label={`รายการ ${item.sku_code}`}
                        onDelete={deleteInvInboundItem.bind(null, item.id, order.id)}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={editable ? 6 : 5}
                  className="py-8 text-center text-muted-foreground"
                >
                  ยังไม่มีรายการ — ให้คลังสแกน LIFF หรือ Inventory เพิ่มด้านล่าง
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </DataTableShell>
      </section>

      {editable ? (
        <section className="mt-4 space-y-3">
          <div className="border-b border-border/60 pb-2">
            <h2 className="text-base font-semibold">เพิ่มรายการรับเข้า</h2>
            <p className="text-xs text-muted-foreground">
              ใช้เพิ่มรายการด้วยมือเมื่อยังไม่ได้สแกน หรือใช้เติมข้อมูลก่อนเปิดรับสแกน
            </p>
          </div>
          <InboundAddItemForm
            orderId={order.id}
            skus={skus}
            unitConfigs={unitConfigs}
          />
        </section>
      ) : null}
    </AdminPageShell>
  )
}
