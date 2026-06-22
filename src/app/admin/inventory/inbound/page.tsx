import Link from "next/link"
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
import {
  INBOUND_STATUS_LABELS,
  listInvInboundOrders,
} from "@/features/inventory/inbound-data"
import type { InvInboundStatus } from "@/features/inventory/types"
import { formatThaiDate } from "@/lib/datetime/thailand"
import { canAccessInventoryPortal, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

function statusVariant(status: InvInboundStatus) {
  if (status === "approved") return "approved" as const
  if (status === "pending") return "pending" as const
  if (status === "cancelled") return "neutral" as const
  return "neutral" as const
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof PackagePlus
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString("th-TH")}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-brand-red">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

export default async function InventoryInboundPage() {
  const employee = await requireInventoryPortal()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const canManage = canAccessInventoryPortal(employee)

  let loadError: string | null = null
  let orders: Awaited<ReturnType<typeof listInvInboundOrders>> = []

  try {
    orders = await listInvInboundOrders()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดใบรับเข้าไม่สำเร็จ"
  }

  const draftCount = orders.filter((order) => order.status === "draft").length
  const pendingCount = orders.filter((order) => order.status === "pending").length
  const approvedCount = orders.filter((order) => order.status === "approved").length
  const totalItems = orders.reduce((sum, order) => sum + order.item_count, 0)

  return (
    <AdminPageShell
      title="รับเข้าสินค้า (Inbound)"
      description={
        readOnly
          ? "ดูใบรับเข้า (read-only)"
          : "สร้างใบรับเข้า → คลังสแกน barcode → Inventory ตรวจอนุมัติ → เพิ่มสต็อก"
      }
      action={
        canManage ? (
          <Link
            href="/admin/inventory/inbound/new"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            + สร้างใบรับเข้า
          </Link>
        ) : undefined
      }
    >
      {loadError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={PackagePlus}
          label="ใบรับทั้งหมด"
          value={orders.length}
          hint="รายการรับเข้าทั้งหมดใน workspace นี้"
        />
        <SummaryCard
          icon={ClipboardList}
          label="แบบร่าง"
          value={draftCount}
          hint="ใบรับที่ยังต้องเติมรายการหรือเตรียมเปิดรับสแกน"
        />
        <SummaryCard
          icon={ScanLine}
          label="เปิดรับสแกน"
          value={pendingCount}
          hint="ใบรับที่คลังสามารถเปิด LIFF เพื่อสแกนของจริงได้แล้ว"
        />
        <SummaryCard
          icon={ShieldCheck}
          label="อนุมัติแล้ว"
          value={approvedCount}
          hint={`รวม ${totalItems.toLocaleString("th-TH")} รายการสินค้าในทุกใบรับ`}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">Receiving queue</h2>
            <p className="text-xs text-muted-foreground">
              เรียงจากใบรับล่าสุด ใช้ดูว่าใบไหนยังรอเตรียมรายการ รอสแกน หรือรออนุมัติ
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            แบบร่าง {draftCount.toLocaleString("th-TH")} · เปิดรับสแกน {pendingCount.toLocaleString("th-TH")}
          </div>
        </div>
        <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>คลัง</TableHead>
              <TableHead>รายการ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">ดู</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{formatThaiDate(order.created_at)}</TableCell>
                  <TableCell>{order.supplier_name}</TableCell>
                  <TableCell>{order.warehouse_name}</TableCell>
                  <TableCell>{order.item_count}</TableCell>
                  <TableCell>
                    <StatusPill
                      label={INBOUND_STATUS_LABELS[order.status]}
                      variant={statusVariant(order.status)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/admin/inventory/inbound/${order.id}`}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                    >
                      รายละเอียด
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  ยังไม่มีใบรับเข้า
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </DataTableShell>
      </section>
    </AdminPageShell>
  )
}
