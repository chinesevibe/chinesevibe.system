import { DamageCreateForm } from "@/features/inventory/DamageCreateForm"
import { getDamageCreateOptions } from "@/features/inventory/actions/consumption"
import { requireRole } from "@/lib/auth/require-role"

export default async function LiffInventoryDamageCreatePage() {
  await requireRole("employee", "branch_manager", "hr", "admin", "dev")
  const options = await getDamageCreateOptions()
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 bg-background p-4">
      <div>
        <h1 className="text-lg font-semibold">แจ้งความเสียหาย</h1>
        <p className="text-sm text-muted-foreground">ใช้กับมือถือ/LIFF ได้โดยตรง พร้อมแนบรูปจากกล้อง</p>
      </div>
      <DamageCreateForm options={options} />
    </main>
  )
}
