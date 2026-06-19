import Link from "next/link"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { listBomRows } from "@/features/inventory/actions/bom"
import { getTransferCreateOptions } from "@/features/inventory/actions/transfer"
import { BomManagementPanel } from "@/features/inventory/BomManagementPanel"
import { canManageInventory } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryBomPage() {
  const employee = await requireInventoryPortal()
  const [rows, options] = await Promise.all([listBomRows(), getTransferCreateOptions()])

  return (
    <AdminPageShell
      title="สูตร BOM / ตัดตามสูตร"
      description={
        canManageInventory(employee)
          ? "กำหนดวัตถุดิบต่อสินค้าสำเร็จรูป และตัดสต็อกตามสูตร (FEFO)"
          : "ดูสูตรและตัดตามสูตรจากคลัง"
      }
    >
      <BomManagementPanel rows={rows} options={options} />
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href="/admin/inventory" className="text-brand-red hover:underline">
          ← กลับภาพรวมคลัง
        </Link>
      </p>
    </AdminPageShell>
  )
}
