import { InventoryGuideShell } from "@/features/inventory/guide/InventoryGuideShell"
import { getInventoryAlertCount } from "@/features/inventory/expansion-data"
import { isInventoryManagerStaff } from "@/lib/auth/department-access"
import {
  isCeo,
  isDev,
  isInventoryPortalUser,
  isInventoryRole,
  hasHrInventoryAccess,
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
    hasHrInventoryAccess(employee) ||
    isCeo(employee.role) ||
    isInventoryRole(employee.role) ||
    isInventoryManagerStaff(employee.department, employee.position)
  const alertCount = await getInventoryAlertCount().catch(() => 0)

  return (
    <InventoryGuideShell
      staffMode={staffMode}
      showMasterData={showMasterData}
      alertCount={alertCount}
    >
      {children}
    </InventoryGuideShell>
  )
}
