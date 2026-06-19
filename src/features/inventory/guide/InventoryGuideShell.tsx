"use client"

import { InventoryGuideHighlight } from "@/features/inventory/guide/InventoryGuideHighlight"
import { InventoryGuidePanel } from "@/features/inventory/guide/InventoryGuidePanel"
import { InventoryGuideProvider } from "@/features/inventory/guide/InventoryGuideProvider"
import { InventorySubNav } from "@/features/inventory/InventorySubNav"

export function InventoryGuideShell({
  staffMode,
  showMasterData,
  alertCount,
  children,
}: {
  staffMode: boolean
  showMasterData: boolean
  alertCount: number
  children: React.ReactNode
}) {
  return (
    <InventoryGuideProvider staffMode={staffMode} showMasterData={showMasterData}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <InventorySubNav
          staffMode={staffMode}
          showMasterData={showMasterData}
          alertCount={alertCount}
        />
        {children}
        <InventoryGuideHighlight />
        <InventoryGuidePanel />
      </div>
    </InventoryGuideProvider>
  )
}
