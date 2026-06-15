import { createClient } from "@/lib/supabase/server"

export type BranchManagerCandidate = {
  id: string
  name: string
  employee_code: string | null
  department: string | null
}

/** พนักงานที่ลงทะเบียน LINE และ HR อนุมัติแล้ว (status active) */
export async function listBranchManagerCandidates(): Promise<BranchManagerCandidate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, name, employee_code, department")
    .eq("status", "active")
    .not("line_user_id", "is", null)
    .not("name", "is", null)
    .order("name")

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    employee_code: (row.employee_code as string | null) ?? null,
    department: (row.department as string | null) ?? null,
  }))
}
