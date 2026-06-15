import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryReportTransferPage() {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "transfer",
    title: "Transfer Report",
    description: "รายการโอนระหว่างสาขา พร้อมยอดส่งและยอดรับ",
  })
}
