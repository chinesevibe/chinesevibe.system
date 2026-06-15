import { createClient } from "@/lib/supabase/server"

export type OrganizationPosition = {
  id: string
  name: string
  employeeCount: number
}

export type OrganizationDepartment = {
  id: string
  name: string
  employeeCount: number
  positions: OrganizationPosition[]
}

/** @deprecated use OrganizationDepartment */
export type DepartmentRow = OrganizationDepartment

export async function getOrganizationTree(): Promise<OrganizationDepartment[]> {
  const supabase = await createClient()

  const [deptRes, posRes, empRes] = await Promise.all([
    supabase.from("hr_departments").select("id, name").order("name"),
    supabase
      .from("hr_positions")
      .select("id, name, department_id")
      .order("name"),
    supabase
      .from("hr_employees")
      .select("department, position")
      .eq("status", "active"),
  ])

  if (deptRes.error) throw deptRes.error
  if (posRes.error) throw posRes.error
  if (empRes.error) throw empRes.error

  const deptCounts = new Map<string, number>()
  const positionCounts = new Map<string, number>()

  for (const e of empRes.data ?? []) {
    const department = e.department as string | null
    const position = e.position as string | null
    if (department) {
      deptCounts.set(department, (deptCounts.get(department) ?? 0) + 1)
      if (position) {
        const key = `${department}\0${position}`
        positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1)
      }
    }
  }

  const positionsByDept = new Map<string, OrganizationPosition[]>()
  for (const row of posRes.data ?? []) {
    const departmentId = row.department_id as string | null
    if (!departmentId) continue
    const deptName =
      (deptRes.data ?? []).find((d) => d.id === departmentId)?.name ?? ""
    const posName = row.name as string
    const list = positionsByDept.get(departmentId) ?? []
    list.push({
      id: row.id as string,
      name: posName,
      employeeCount: positionCounts.get(`${deptName}\0${posName}`) ?? 0,
    })
    positionsByDept.set(departmentId, list)
  }

  return (deptRes.data ?? []).map((d) => {
    const name = d.name as string
    return {
      id: d.id as string,
      name,
      employeeCount: deptCounts.get(name) ?? 0,
      positions: positionsByDept.get(d.id as string) ?? [],
    }
  })
}

export async function getDepartments() {
  return getOrganizationTree()
}
