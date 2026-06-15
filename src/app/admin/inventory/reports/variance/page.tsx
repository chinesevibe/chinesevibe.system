import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryReportVariancePage() {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "variance",
    title: "Stock Count Variance Report",
    description: "เทียบ system qty กับ physical qty จาก stock count ที่ completed",
  })
}
