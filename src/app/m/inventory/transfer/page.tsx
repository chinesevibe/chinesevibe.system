import { MobileShell } from "@/components/mobile/MobileShell"
import { TransferListClient } from "@/components/mobile/TransferListClient"
import { listTransfers } from "@/features/inventory/actions/transfer"

export default async function MobileTransferListPage() {
  let transfers: Awaited<ReturnType<typeof listTransfers>> = []
  try {
    transfers = await listTransfers()
  } catch (err) {
    console.error("Failed to load transfers:", err)
  }

  return (
    <MobileShell variant="back" title="โอนสต็อก" activeTab="menu">
      <TransferListClient transfers={transfers} />
    </MobileShell>
  )
}
