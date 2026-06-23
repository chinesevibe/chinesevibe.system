import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Barcode, ClipboardList, Package, RefreshCw } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
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
  },
  {
    href: "/portal/stock",
    title: "เช็คสต็อก",
    desc: "ดูของคงเหลือ, ต่ำกว่า Min, และหมดสต็อก",
    icon: Package,
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
  },
] as const

const managerActions = [
  {
    href: "/admin/inventory/requisition",
    title: "ใบเบิก",
    desc: "ตรวจสถานะใบเบิกของครัว",
    icon: ClipboardList,
    tone: "border-amber-200 bg-amber-50/80 text-amber-900",
  },
  {
    href: "/admin/inventory/transfer",
    title: "โอนสินค้า",
    desc: "ติดตามงานโอนระหว่างสาขา",
    icon: RefreshCw,
    tone: "border-sky-200 bg-sky-50/80 text-sky-900",
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

  return (
    <AdminPageShell
      title="คลังสินค้า"
      description="รวมงานคลังสำหรับมือถือ เริ่มจากรับเข้าและเช็คสต็อก แล้วค่อยเปิดงาน admin เมื่อจำเป็น"
    >
      <div className="grid gap-3">
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
              </div>
              <ArrowRight className="size-4 shrink-0 opacity-60" />
            </Link>
          )
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium">ลำดับใช้งานแนะนำ</p>
        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
          <li>1. เปิดรับเข้าแล้วสแกนของจริงตามใบ</li>
          <li>2. เช็คของต่ำกว่า Min และของหมดก่อนเปิดครัว</li>
          <li>3. ผู้จัดการค่อยเปิดใบเบิกและงานโอนที่ยังค้าง</li>
        </ul>
      </div>

      {canManageInventory(employee) ? (
        <div className="mt-4">
          <Link
            href="/admin/inventory"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            เปิดหน้า Inventory Admin
          </Link>
        </div>
      ) : null}
    </AdminPageShell>
  )
}
