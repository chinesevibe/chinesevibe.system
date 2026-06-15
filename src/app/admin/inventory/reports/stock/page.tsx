import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryReportStockPage() {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "stock",
    title: "Stock On Hand Report",
    description: "ยอดคงเหลือปัจจุบันตาม SKU และคลัง",
  })
}
