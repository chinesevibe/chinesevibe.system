import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { BranchesPanel } from "@/features/branches/BranchesPanel"
import { listBranches } from "@/features/branches/data"
import { listBranchManagerCandidates } from "@/features/branches/manager-candidates"
import { isCeo, isDev } from "@/lib/auth/roles"
import { requireRole } from "@/lib/auth/require-role"

export default async function AdminBranchesPage() {
  const employee = await requireRole("hr", "ceo", "dev")
  const [branches, managerCandidates] = await Promise.all([
    listBranches(),
    listBranchManagerCandidates(),
  ])
  const readOnly = isCeo(employee.role) && !isDev(employee.role)

  return (
    <AdminPageShell
      title="สาขา"
      description={
        readOnly
          ? "ดูข้อมูลสาขาทั้งหมด (read-only)"
          : "จัดการสาขา — มอบหมาย Branch Manager ได้ภายหลัง"
      }
    >
      <BranchesPanel
        branches={branches}
        managerCandidates={managerCandidates}
        readOnly={readOnly}
      />
    </AdminPageShell>
  )
}
