import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryReportConsumptionPage() {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "consumption",
    title: "Consumption Report",
    description: "การใช้จริง แยกประเภท production / sampling / testing",
  })
}
