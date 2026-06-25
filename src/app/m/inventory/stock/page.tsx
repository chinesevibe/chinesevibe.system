import { redirect } from "next/navigation"

import { MobileShell } from "@/components/mobile/MobileShell"
import { StockListClient } from "@/components/mobile/StockListClient"
import { listInvStockRows } from "@/features/inventory/stock-data"
import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function MobileStockListPage() {
  const employee = await getCurrentEmployee()
  if (!employee) redirect("/login?next=/m/inventory/stock")
  if (!canAccessPortalInventoryWorkspace(employee)) redirect("/portal")

  const rows = await listInvStockRows()

  return (
    <MobileShell variant="back" title="สต็อกสินค้า" activeTab="stock" showScan>
      <StockListClient rows={rows} />
    </MobileShell>
  )
}
