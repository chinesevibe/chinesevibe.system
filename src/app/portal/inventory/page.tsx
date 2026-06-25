import { redirect } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Barcode,
  Building2,
  ClipboardList,
  PackageCheck,
  Package,
  RefreshCw,
  ShieldAlert,
  Wrench,
} from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { PortalInventoryTaskNav } from "@/components/portal/PortalInventoryTaskNav"
import { buttonVariants } from "@/components/ui/button"
import { getInventoryAlerts, getInventoryFilterOptions } from "@/features/inventory/expansion-data"
import { listInvInboundOrders } from "@/features/inventory/inbound-data"
import { listInvStockRows } from "@/features/inventory/stock-data"
import { canManageInventory, canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { cn } from "@/lib/utils"

const workerActions = [
  {
    href: "/portal/inbound",
    title: "รับเข้า",
    desc: "ดูใบรับเข้าและเข้าสแกนต่อ",
    icon: Barcode,
    tone: "border-red-200 bg-red-50/70 text-red-900",
    cue: "เริ่มจากงานรับเข้าที่พร้อมสแกน",
  },
  {
    href: "/portal/stock",
    title: "เช็คสต็อก",
    desc: "ดูของคงเหลือ ต่ำกว่าขั้นต่ำ และหมดสต็อก",
    icon: Package,
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    cue: "เช็คของต่ำกว่าขั้นต่ำก่อนเปิดใช้งานหน้างาน",
  },
  {
    href: "/portal/damage",
    title: "แจ้งเสียหาย",
    desc: "บันทึกของเสียหาย, หมดอายุ, หรือสูญหายจากมือถือ",
    icon: Wrench,
    tone: "border-orange-200 bg-orange-50/80 text-orange-900",
    cue: "ใช้ตอนต้องถ่ายรูปและแจ้งเหตุหน้างานทันที",
  },
] as const

const managerActions = [
  {
    href: "/portal/requisition",
    title: "ใบเบิก",
    desc: "ตรวจสถานะใบเบิกของครัว",
    icon: ClipboardList,
    tone: "border-amber-200 bg-amber-50/80 text-amber-900",
    cue: "เปิดงานค้างของครัวเมื่อมีเวลาอนุมัติหรือจ่ายของ",
  },
  {
    href: "/portal/transfer",
    title: "โอนสินค้า",
    desc: "ติดตามงานโอนระหว่างสาขา",
    icon: RefreshCw,
    tone: "border-sky-200 bg-sky-50/80 text-sky-900",
    cue: "ตามของที่กำลังย้ายระหว่างสาขา",
  },
  {
    href: "/portal/alerts",
    title: "รายการเตือน",
    desc: "ดูสต็อกต่ำ ใกล้หมดอายุ และความผิดปกติ",
    icon: ShieldAlert,
    tone: "border-violet-200 bg-violet-50/80 text-violet-900",
    cue: "เปิดรายการเตือนแล้วตัดสินใจจากจุดเดียว",
  },
  {
    href: "/portal/stock-count",
    title: "นับสต็อก",
    desc: "สร้างรอบตรวจนับตามสาขาและคลัง",
    icon: PackageCheck,
    tone: "border-lime-200 bg-lime-50/80 text-lime-900",
    cue: "ใช้ก่อนเริ่มรอบตรวจนับของจริงในคลัง",
  },
] as const

export default async function PortalInventoryHubPage() {
  const employee = await getCurrentEmployee()
  if (!employee || !canAccessPortalInventoryWorkspace(employee)) {
    redirect("/portal")
  }

  const actions = canManageInventory(employee)
    ? [...workerActions, ...managerActions]
    : workerActions

  let stockRows: Awaited<ReturnType<typeof listInvStockRows>> = []
  let inboundOrders: Awaited<ReturnType<typeof listInvInboundOrders>> = []
  let expiryCount = 0
  let branchName: string | null = null
  let branchWarehouseCount = 0
  const loadIssues: string[] = []

  try {
    stockRows = await listInvStockRows()
  } catch {
    loadIssues.push("โหลดสรุปสต็อกไม่สำเร็จ")
  }

  try {
    inboundOrders = await listInvInboundOrders({ status: "pending" })
  } catch {
    loadIssues.push("โหลดงานรับเข้าไม่สำเร็จ")
  }

  try {
    const alerts = await getInventoryAlerts({})
    expiryCount = alerts.filter((row) => row.type === "expiry").length
  } catch {
    loadIssues.push("โหลด alerts ไม่สำเร็จ")
  }

  try {
    const filterOptions = await getInventoryFilterOptions()
    const currentBranch = filterOptions.branches.find((branch) => branch.id === employee.branch_id)
    branchName = currentBranch?.name ?? null
    branchWarehouseCount = employee.branch_id
      ? filterOptions.warehouses.filter((warehouse) => warehouse.branch_id === employee.branch_id)
          .length
      : filterOptions.warehouses.length
  } catch {
    loadIssues.push("โหลดขอบเขตสาขา/คลังไม่สำเร็จ")
  }

  const belowMinCount = stockRows.filter((row) => row.belowMin).length
  const zeroCount = stockRows.filter((row) => row.quantity === 0).length
  const readyInboundCount = inboundOrders.filter((order) => order.item_count > 0).length
  const blockedInboundCount = inboundOrders.filter((order) => order.item_count <= 0).length
  const attentionCount =
    readyInboundCount + blockedInboundCount + belowMinCount + expiryCount
  const priorityMessage =
    readyInboundCount > 0
      ? `มีใบรับเข้าพร้อมสแกน ${readyInboundCount} ใบ`
      : blockedInboundCount > 0
        ? `มีใบรับเข้าค้าง ${blockedInboundCount} ใบ แต่ยังไม่มีรายการพร้อมสแกน`
      : belowMinCount > 0 || zeroCount > 0
        ? `มี ${belowMinCount} รายการต่ำกว่าขั้นต่ำ และ ${zeroCount} รายการหมดสต็อก`
        : "ยังไม่มีงานด่วนค้างใน summary ที่โหลดได้"

  return (
    <AdminPageShell
      title="คลังสินค้า"
      description="หน้าเริ่มงานคลังบนมือถือ เปิดงานหลักจากจุดเดียว แล้วค่อยลงรายละเอียดในแต่ละขั้นตอน"
    >
      <PortalInventoryTaskNav
        current="home"
        showManagerLinks={canManageInventory(employee)}
      />

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">สรุปงานตอนนี้</p>
              <p className="mt-1 text-sm text-muted-foreground">{priorityMessage}</p>
            </div>
            <div className="rounded-xl bg-muted/30 px-3 py-2 text-right">
              <p className="text-[11px] text-muted-foreground">งานที่ต้องเช็ค</p>
              <p className="text-lg font-semibold tabular-nums">{attentionCount}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border/80 bg-muted/20 px-3 py-3">
              <p className="text-[11px] text-muted-foreground">พร้อมรับเข้า</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{readyInboundCount}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3">
              <p className="text-[11px] text-amber-700">ต่ำกว่าขั้นต่ำ</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-800">
                {belowMinCount}
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/70 px-3 py-3">
              <p className="text-[11px] text-red-700">หมดสต็อก</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-red-800">
                {zeroCount}
              </p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-3">
              <p className="text-[11px] text-violet-700">ใกล้หมดอายุ</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-violet-800">
                {expiryCount}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-muted/30 p-3">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">ขอบเขตที่กำลังใช้งาน</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {branchName ? `สาขา ${branchName}` : "ทุกสาขาตามสิทธิที่ได้รับ"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {branchWarehouseCount > 0
                  ? `คลังที่เกี่ยวข้อง ${branchWarehouseCount} คลัง`
                  : "ยังไม่พบข้อมูลคลังในขอบเขตนี้"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {employee.position ? `${employee.position} · ` : ""}
                {employee.department ?? "ไม่ระบุแผนก"}
              </p>
            </div>
          </div>
        </section>
      </div>

      {loadIssues.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">บาง summary โหลดไม่ครบ</p>
              <p className="mt-1">{loadIssues.join(" · ")}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold">งานที่ควรทำตอนนี้</p>
            <p className="text-sm text-muted-foreground">
              เริ่มจากงานที่กระทบการเคลื่อนไหวสต็อกก่อน แล้วค่อยเปิดงานจัดการขั้นถัดไป
            </p>
          </div>

        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 shadow-sm transition-colors hover:bg-muted/30",
                action.tone
              )}
            >
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{action.title}</p>
                <p className="text-sm opacity-80">{action.desc}</p>
                <p className="mt-1 text-xs opacity-70">{action.cue}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 opacity-60" />
            </Link>
          )
        })}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium">ลำดับใช้งานแนะนำ</p>
        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
          <li>1. เปิดรับเข้าแล้วสแกนของจริงตามใบที่พร้อมก่อน</li>
          <li>2. เช็คของต่ำกว่าขั้นต่ำและของหมดก่อนเปิดครัวหรือส่งของ</li>
          <li>3. ถ้ามีของใกล้หมดอายุ ให้เปิดหน้าสต็อกหรือรายการเตือนเพื่อตัดสินใจต่อ</li>
          <li>4. ผู้จัดการค่อยเปิดใบเบิก งานโอน และรายการเตือนที่ค้าง</li>
        </ul>
      </div>

      {canManageInventory(employee) ? (
        <div>
          <Link
            href="/admin/inventory"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            เปิด Inventory Admin แบบเต็ม
          </Link>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
