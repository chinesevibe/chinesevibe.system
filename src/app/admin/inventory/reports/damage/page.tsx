import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

export default async function InventoryReportDamagePage() {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "damage",
    title: "Damage Report",
    description: "รายงานความเสียหาย grouped ตาม damage_type และสถานะ",
  })
}
