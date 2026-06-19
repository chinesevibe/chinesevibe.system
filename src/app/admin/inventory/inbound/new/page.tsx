import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { buttonVariants } from "@/components/ui/button"
import { createInvInboundOrderAndRedirect } from "@/features/inventory/actions/inbound"
import { getInvSuppliers } from "@/features/inventory/actions/supplier"
import { getInvWarehousesWithBranch } from "@/features/inventory/actions/warehouse"
import {
  InventoryFormField,
  InventorySelect,
} from "@/features/inventory/InventoryFormFields"
import { invInputClass } from "@/features/inventory/form-styles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"
import { cn } from "@/lib/utils"

function warehouseLabel(w: {
  code: string
  name: string
  inv_branches: unknown
}) {
  const branchRaw = w.inv_branches
  const branch = Array.isArray(branchRaw) ? branchRaw[0] : branchRaw
  const branchName = (branch as { name?: string } | null)?.name
  return branchName ? `${w.code} — ${w.name} (${branchName})` : `${w.code} — ${w.name}`
}

export default async function NewInboundOrderPage() {
  await requireInventoryPortal()

  const [suppliers, warehouses] = await Promise.all([
    getInvSuppliers(),
    getInvWarehousesWithBranch(),
  ])

  const activeSuppliers = suppliers.filter((s) => s.is_active)
  const activeWarehouses = warehouses.filter((w) => w.is_active)

  return (
    <AdminPageShell
      title="สร้างใบรับเข้า"
      description="สร้างใบรับเข้า — คลังสแกนได้ทันที → Inventory ตรวจแล้วอนุมัติเพิ่มสต็อก"
      action={
        <Link
          href="/admin/inventory/inbound"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          ← กลับ
        </Link>
      }
    >
      <form action={createInvInboundOrderAndRedirect} className="mx-auto max-w-lg space-y-4">
        <InventoryFormField label="ผู้จำหน่าย" htmlFor="supplier_id">
          <InventorySelect id="supplier_id" name="supplier_id" defaultValue="">
            <option value="">ไม่ระบุผู้จำหน่าย</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </InventorySelect>
          {activeSuppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              ยังไม่มี Supplier —{" "}
              <Link
                href="/admin/inventory/suppliers"
                className="text-brand-red hover:underline"
              >
                ไปเพิ่มที่เมนู Supplier
              </Link>
            </p>
          ) : null}
        </InventoryFormField>
        <InventoryFormField label="คลังรับเข้า" htmlFor="warehouse_id">
          <InventorySelect id="warehouse_id" name="warehouse_id" required defaultValue="">
            <option value="" disabled>
              เลือกคลัง
            </option>
            {activeWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {warehouseLabel(w)}
              </option>
            ))}
          </InventorySelect>
        </InventoryFormField>
        <InventoryFormField label="หมายเหตุ" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className={invInputClass}
          />
        </InventoryFormField>
        <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
          สร้างและเปิดรับสแกน
        </button>
      </form>
    </AdminPageShell>
  )
}
