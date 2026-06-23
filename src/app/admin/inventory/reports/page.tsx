import Link from "next/link"
import { ArrowUpRight, ClipboardList, PackageSearch, ShieldCheck, Truck } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

const REPORT_GROUPS = [
  {
    title: "Stock decisions",
    description: "ดูของคงเหลือ ความต่างการนับ และ FEFO exception ก่อนตัดสินใจเติมหรือเคลียร์สต็อก",
    recommended: "เริ่มจาก Stock On Hand ถ้าต้องตัดสินใจเติมของวันนี้",
    links: [
      { href: "/admin/inventory/reports/stock", label: "Stock On Hand" },
      { href: "/admin/inventory/reports/variance", label: "Stock Count Variance" },
      { href: "/admin/inventory/reports/fefo-override", label: "FEFO Override" },
    ],
  },
  {
    title: "Movement flow",
    description: "ไล่ของเข้า เบิก โอน และใช้จริง ตามเส้นทางการเคลื่อนไหวของสต็อก",
    recommended: "เริ่มจาก Inbound หรือ Requisition ถ้ากำลังตามงานประจำวัน",
    links: [
      { href: "/admin/inventory/reports/inbound", label: "Inbound" },
      { href: "/admin/inventory/reports/requisition", label: "Requisition" },
      { href: "/admin/inventory/reports/transfer", label: "Transfer" },
      { href: "/admin/inventory/reports/consumption", label: "Consumption" },
    ],
  },
  {
    title: "Loss and control",
    description: "ดูความเสียหายและเส้นทางตรวจสอบย้อนหลังเพื่อหาจุดรั่วและตัดสินใจแก้ไข",
    recommended: "เริ่มจาก Damage ถ้าต้องหาสาเหตุของการสูญเสีย",
    links: [
      { href: "/admin/inventory/reports/damage", label: "Damage" },
      { href: "/admin/inventory/reports/audit", label: "Audit Trail" },
    ],
  },
]

const SUMMARY_CARDS = [
  { label: "หมวดรายงาน", value: "3", icon: ClipboardList },
  { label: "รายงานการเคลื่อนไหว", value: "4", icon: Truck },
  { label: "รายงานควบคุม", value: "3", icon: ShieldCheck },
  { label: "พร้อม export", value: "CSV", icon: PackageSearch },
]

export default async function InventoryReportsHubPage() {
  await requireInventoryPortal()
  return (
    <AdminPageShell
      title="Inventory Reports"
      description="รวมรายงานหลัก การเคลื่อนไหว ความต่างการนับ และ audit trail"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-border/80 bg-muted/15 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Start here
          </p>
          <p className="mt-2 text-sm text-foreground">
            ถ้ากำลังตัดสินใจเติมของ ให้เริ่มจาก <span className="font-semibold">Stock On Hand</span>.
            ถ้ากำลังไล่งานประจำวัน ให้เริ่มจาก <span className="font-semibold">Inbound</span> หรือ
            <span className="font-semibold"> Requisition</span>. ถ้ากำลังหาจุดสูญเสีย ให้เปิด
            <span className="font-semibold"> Damage</span> ก่อน.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon

            return (
              <div key={card.label} className="rounded-2xl border border-border/80 bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <Icon className="size-4 text-brand-red" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{card.value}</p>
              </div>
            )
          })}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {REPORT_GROUPS.map((group) => (
            <section key={group.title} className="rounded-2xl border border-border/80 bg-background p-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold">{group.title}</h2>
                <p className="text-sm text-muted-foreground">{group.description}</p>
                <p className="text-xs text-brand-red">{group.recommended}</p>
              </div>
              <div className="mt-4 space-y-2">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/15 px-4 py-3 text-sm font-medium transition-colors hover:border-brand-red/35 hover:bg-muted/40"
                  >
                    <span>{link.label}</span>
                    <ArrowUpRight className="size-4 text-brand-red" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AdminPageShell>
  )
}
