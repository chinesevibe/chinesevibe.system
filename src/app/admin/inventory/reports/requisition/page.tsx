import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryReportRequisitionPage() {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "requisition",
    title: "Requisition Report",
    description: "รายงานใบเบิกตั้งแต่ขอ อนุมัติ จ่าย และรับ",
  })
}
