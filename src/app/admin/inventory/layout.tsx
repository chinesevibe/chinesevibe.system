import { InventorySubNav } from "@/features/inventory/InventorySubNav"
import { getInventoryAlertCount } from "@/features/inventory/expansion-data"
import {
  canManageHr,
  isCeo,
  isDev,
  isInventoryPortalUser,
  isInventoryRole,
} from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const employee = await requireInventoryPortal()
  const staffMode = isInventoryPortalUser(employee)
  const showMasterData =
    isDev(employee.role) ||
    canManageHr(employee.role) ||
    isCeo(employee.role) ||
    isInventoryRole(employee.role)
  const alertCount = await getInventoryAlertCount().catch(() => 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <InventorySubNav
        staffMode={staffMode}
        showMasterData={showMasterData}
        alertCount={alertCount}
      />
      {children}
    </div>
  )
}
