import Link from "next/link"
import { notFound } from "next/navigation"

import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { getInvSupplier } from "@/features/inventory/actions/supplier"
import { SupplierForm } from "@/features/inventory/SupplierForm"
import { canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryMasterData } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditSupplierPage({ params }: PageProps) {
  const employee = await requireInventoryMasterData()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)
  const { id } = await params

  const supplier = await getInvSupplier(id)
  if (!supplier) notFound()

  return (
    <AdminPageShell
      title={
        readOnly ? `ดู Supplier — ${supplier.code}` : `แก้ไข Supplier — ${supplier.code}`
      }
      description={
        <Link href="/admin/inventory/suppliers" className="text-brand-red hover:underline">
          ← กลับรายการ Supplier
        </Link>
      }
    >
      <SupplierForm
        mode="edit"
        initial={supplier}
        readOnly={readOnly || !canManageHr(employee.role)}
      />
    </AdminPageShell>
  )
}
