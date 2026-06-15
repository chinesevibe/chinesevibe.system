import { InventoryReportPage } from "@/features/inventory/InventoryReportPage"
import { parseInventoryFilters } from "@/features/inventory/inventory-filter-utils"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function InventoryReportInboundPage({ searchParams }: PageProps) {
  await requireInventoryPortal()
  return InventoryReportPage({
    kind: "inbound",
    title: "Inbound Report",
    description: "รายการรับเข้าสินค้าตาม lot ต้นทุน และวันหมดอายุ",
    filters: parseInventoryFilters(await searchParams),
  })
}
