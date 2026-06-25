import { MobileShell } from "@/components/mobile/MobileShell"
import { getDamageCreateOptions } from "@/features/inventory/actions/consumption"
import { DamageCreateForm } from "@/features/inventory/DamageCreateForm"

export default async function MobileDamagePage() {
  const options = await getDamageCreateOptions()

  return (
    <MobileShell variant="back" title="แจ้งความเสียหาย" activeTab="damage">
      <div className="flex flex-1 flex-col gap-4 p-4">
        <DamageCreateForm options={options} successBasePath="/m/inventory" />
      </div>
    </MobileShell>
  )
}
