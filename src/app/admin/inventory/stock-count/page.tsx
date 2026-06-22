import Link from "next/link"
import { notFound } from "next/navigation"
import { ClipboardList, PackageCheck, ScanSearch, TimerReset } from "lucide-react"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
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
import { InventoryLoadError } from "@/features/inventory/InventorySearchBar"
import { listStockCounts } from "@/features/inventory/actions/stock-count"
import { canManageInventory, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { formatThaiDate, formatThaiDateTime } from "@/lib/datetime/thailand"
import { cn } from "@/lib/utils"

function statusVariant(status: "draft" | "counting" | "completed" | "cancelled") {
  if (status === "completed") return "approved" as const
  if (status === "counting") return "pending" as const
  if (status === "cancelled") return "rejected" as const
  return "neutral" as const
}

const STATUS_LABELS = {
  draft: "ร่าง",
  counting: "กำลังนับ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
} as const

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ScanSearch
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

export default async function InventoryStockCountPage() {
  const employee = await requireInventoryPortal()
  if (!canManageInventory(employee) && !isCeo(employee.role) && !isDev(employee.role)) {
    notFound()
  }
  let rows: Awaited<ReturnType<typeof listStockCounts>> = []
  let loadError: string | null = null

  try {
    rows = await listStockCounts()
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดรอบตรวจนับไม่สำเร็จ"
  }

  const draftCount = rows.filter((row) => row.status === "draft").length
  const countingCount = rows.filter((row) => row.status === "counting").length
  const completedCount = rows.filter((row) => row.status === "completed").length
  const totalPendingItems = rows.reduce((sum, row) => sum + Math.max(0, row.item_count - row.counted_count), 0)

  return (
    <AdminPageShell
      title="ตรวจนับสต๊อก"
      description="สร้างแผนตรวจนับ บันทึกจำนวนจริง และ finalize เพื่อสร้าง stock adjustment อัตโนมัติ"
      action={
        <Link href="/admin/inventory/stock-count/create" className={cn(buttonVariants({ size: "sm" }))}>
          + สร้างรอบตรวจนับ
        </Link>
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ScanSearch}
          label="รอบตรวจนับทั้งหมด"
          value={rows.length}
          hint="รวมทุก cycle ที่สร้างใน stock count workspace"
        />
        <SummaryCard
          icon={ClipboardList}
          label="แบบร่าง"
          value={draftCount}
          hint="รอบที่สร้างแล้วแต่ยังไม่เริ่มนับจริง"
        />
        <SummaryCard
          icon={TimerReset}
          label="กำลังนับ"
          value={countingCount}
          hint="รอบที่ทีมยังกรอก physical qty ไม่ครบ"
        />
        <SummaryCard
          icon={PackageCheck}
          label="เสร็จสิ้น"
          value={completedCount}
          hint={`ยังเหลือ ${totalPendingItems.toLocaleString("th-TH")} รายการที่ยังไม่ถูกกรอกในรอบที่ค้างอยู่`}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">Stock count queue</h2>
            <p className="text-xs text-muted-foreground">
              ใช้ดูว่ารอบไหนยัง draft รอบไหนกำลังนับ และรอบไหน finalize แล้วพร้อมตรวจ variance
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Draft {draftCount.toLocaleString("th-TH")} · Counting {countingCount.toLocaleString("th-TH")}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัส</TableHead>
              <TableHead>สาขา</TableHead>
              <TableHead>คลัง</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่วางแผน</TableHead>
              <TableHead>ความคืบหน้า</TableHead>
              <TableHead>สร้างเมื่อ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  ยังไม่มีรอบตรวจนับ
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/inventory/stock-count/${row.id}`} className="text-brand-red hover:underline">
                      {row.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{row.branch_name}</TableCell>
                  <TableCell>{row.warehouse_name}</TableCell>
                  <TableCell>
                    <StatusPill label={STATUS_LABELS[row.status]} variant={statusVariant(row.status)} />
                  </TableCell>
                  <TableCell>{row.planned_at ? formatThaiDate(row.planned_at) : "—"}</TableCell>
                  <TableCell>
                    {row.counted_count} / {row.item_count}
                  </TableCell>
                  <TableCell>{formatThaiDateTime(row.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </section>
    </AdminPageShell>
  )
}
