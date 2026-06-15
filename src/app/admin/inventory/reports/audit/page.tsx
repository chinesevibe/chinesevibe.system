import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryReportAuditPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "audit",
    title: "Audit Trail Report",
    description: "ประวัติการเคลื่อนไหวสต็อกทั้งหมด",
    filters: parseInventoryFilters(await searchParams),
  })
}
