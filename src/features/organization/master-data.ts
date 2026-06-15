import { createClient } from "@/lib/supabase/server"

export type OrgDepartment = {
  id: string
  name: string
  branch_id: string | null
}

export type OrgPosition = {
  id: string
  name: string
  department_id: string | null
  branch_id: string | null
}

export async function getOrganizationMasterData(): Promise<{
  departments: OrgDepartment[]
  positions: OrgPosition[]
}> {
  const supabase = await createClient()
  const [deptRes, posRes] = await Promise.all([
    supabase.from("hr_departments").select("id, name, branch_id").order("name"),
    supabase
      .from("hr_positions")
      .select("id, name, department_id, branch_id")
      .order("name"),
  ])

  if (deptRes.error) throw deptRes.error
  if (posRes.error) throw posRes.error

  return {
    departments: (deptRes.data ?? []) as OrgDepartment[],
    positions: (posRes.data ?? []) as OrgPosition[],
  }
}
