import Link from "next/link"
import { ClipboardList, PackageCheck, Sparkles, Warehouse } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { getConsumptionCreateOptions } from "@/features/inventory/actions/consumption"
import { ConsumptionRecordForm } from "@/features/inventory/ConsumptionRecordForm"
import { requireRole } from "@/lib/auth/require-role"
import { cn } from "@/lib/utils"

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ClipboardList
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

export default async function InventoryConsumptionPage() {
  await requireRole("employee", "branch_manager", "hr", "inventory", "dev")
  const options = await getConsumptionCreateOptions()

  return (
    <AdminPageShell
      title="บันทึกการใช้จริง"
      description="บันทึกการใช้วัตถุดิบสำหรับ production, sampling และ testing พร้อมตัดสต็อกทันที"
      action={
        <Link
          href="/admin/inventory/damage"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          รายงานความเสียหาย
        </Link>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ClipboardList}
          label="ประเภทหลัก"
          value="Production / Sampling / Testing"
          hint="แยกเหตุผลการใช้จริงให้ชัดก่อนตัด stock"
        />
        <SummaryCard
          icon={Warehouse}
          label="การตัด stock"
          value="Immediate"
          hint="บันทึกแล้วตัด stock ทันทีที่คลังและสาขาที่เลือก"
        />
        <SummaryCard
          icon={PackageCheck}
          label="ลักษณะข้อมูล"
          value="Actual usage"
          hint="ใช้บันทึกของที่ถูกใช้จริง ไม่ใช่ของเสียหรือรายการรออนุมัติ"
        />
        <SummaryCard
          icon={Sparkles}
          label="Workflow ที่เกี่ยวข้อง"
          value="Stock / Reports"
          hint="ข้อมูลจะไปต่อที่ stock movement และรายงานการใช้จริง"
        />
      </div>
      <ConsumptionRecordForm options={options} />
    </AdminPageShell>
  )
}
