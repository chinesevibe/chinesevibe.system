import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryReportAuditPage() {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "audit",
    title: "Inventory Audit Trail",
    description: "ทุก movement จาก inbound, requisition, consumption, damage, transfer และ adjustment",
  })
}
