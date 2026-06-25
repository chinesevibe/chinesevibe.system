import { LiffPageShell } from "@/components/liff/LiffPageShell"
import { DamageCreateForm } from "@/features/inventory/DamageCreateForm"
import { getDamageCreateOptions } from "@/features/inventory/actions/consumption"
import { requireRole } from "@/lib/auth/require-role"

export default async function LiffInventoryDamageCreatePage() {
  await requireRole("employee", "branch_manager", "hr", "inventory", "dev")
  const options = await getDamageCreateOptions()
  return (
    <LiffPageShell
      title="แจ้งความเสียหาย"
      subtitle="ใช้กับมือถือ/LIFF ได้โดยตรง พร้อมแนบรูปจากกล้อง"
      backHref="/portal/damage"
    >
      <div className="flex flex-1 flex-col gap-4 p-4">
        <DamageCreateForm options={options} successBasePath="/portal/damage" />
      </div>
    </LiffPageShell>
  )
}
