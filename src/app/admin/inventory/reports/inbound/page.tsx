import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryReportInboundPage() {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "inbound",
    title: "Inbound Report",
    description: "รายการรับเข้าสินค้าตาม lot ต้นทุน และวันหมดอายุ",
  })
}
