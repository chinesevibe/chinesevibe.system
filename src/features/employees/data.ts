// Employee list queries — server-only, runs through the caller's session
// (RLS: hr_is_hr_admin allows full read). No service role here.
import { ictToday } from "@/lib/datetime/thailand"
import { employeeAvatarPublicUrl } from "@/lib/employees/avatar"
import { createClient } from "@/lib/supabase/server"
import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"

export const PAGE_SIZE = 12

/** Self-registrations awaiting HR approval + active employees missing branch */
export const ONBOARDING_PENDING_OR_FILTER =
  "and(status.eq.inactive,role.eq.employee),and(status.eq.active,role.eq.employee,branch_id.is.null)"

// Whitelist: sort column comes from the URL — never pass it through raw.
const SORT_COLUMNS = ["name", "contract_start"] as const
export type SortColumn = (typeof SORT_COLUMNS)[number]

export type EmployeeStatusFilter = "all" | "active" | "inactive" | "probation" | "onboarding"

export type BranchFilterOption = {
  id: string
  name: string
}

export type EmployeeListParams = {
  q?: string
  dept?: string
  branch_id?: string
  status?: EmployeeStatusFilter
  sort?: SortColumn
  dir?: "asc" | "desc"
  page?: number
}

export type EmployeeRow = {
  id: string
  employee_code: string | null
  line_user_id: string | null
  name: string
  position: string | null
  department: string | null
  role: string
  branch_id: string | null
  branch_name: string | null
  salary: number | null
  status: "active" | "inactive"
  contract_start: string | null
  contract_file_path: string | null
  probation_end: string | null
  visa_expiry: string | null
  avatar_path: string | null
  avatarUrl: string | null
  displayStatus:
    | "active"
    | "inactive"
    | "probation"
    | "onboarding"
    | "pending_approval"
}

export { ictToday } from "@/lib/datetime/thailand"

export function normalizeParams(raw: {
  [key: string]: string | string[] | undefined
}): Required<EmployeeListParams> {
  const get = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : "")
  const sort = SORT_COLUMNS.includes(get("sort") as SortColumn)
    ? (get("sort") as SortColumn)
    : "name"
  const status = (["active", "inactive", "probation", "onboarding"] as const).includes(
    get("status") as "active"
  )
    ? (get("status") as EmployeeStatusFilter)
    : "all"
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1)
  const branchRaw = get("branch_id")
  const branch_id =
    branchRaw === "__none__" ||
    /^[0-9a-f-]{36}$/i.test(branchRaw)
      ? branchRaw
      : ""
  return {
    q: get("q"),
    dept: get("dept"),
    branch_id,
    status,
    sort,
    dir: get("dir") === "desc" ? "desc" : "asc",
    page,
  }
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`)
}

export async function getEmployees(params: Required<EmployeeListParams>) {
  const supabase = await createClient()
  const today = ictToday()

  let query = supabase
    .from("hr_employees")
    .select(
      `id, employee_code, line_user_id, name, position, department, role, branch_id, salary, status, contract_start, contract_file_path, probation_end, visa_expiry, avatar_path, ${BRANCH_VIA_EMPLOYEE}(name)`,
      { count: "exact" }
    )

  if (params.q) {
    query = query.ilike("name", `%${escapeLike(params.q)}%`)
  }
  if (params.dept) {
    query = query.eq("department", params.dept)
  }
  if (params.branch_id === "__none__") {
    query = query.is("branch_id", null)
  } else if (params.branch_id) {
    query = query.eq("branch_id", params.branch_id)
  }
  if (params.status === "active" || params.status === "inactive") {
    query = query.eq("status", params.status)
  }
  if (params.status === "probation") {
    query = query.eq("status", "active").gte("probation_end", today)
  }
  if (params.status === "onboarding") {
    query = query.or(ONBOARDING_PENDING_OR_FILTER)
  }

  query = query
    .order(params.sort, { ascending: params.dir === "asc" })
    .range((params.page - 1) * PAGE_SIZE, params.page * PAGE_SIZE - 1)

  const { data, count, error } = await query
  if (error) {
    throw error
  }

  const employees: EmployeeRow[] = (data ?? []).map((row) => {
    const branchJoin = row.hr_branches as
      | { name: string }
      | Array<{ name: string }>
      | null
    const branch_name = Array.isArray(branchJoin)
      ? (branchJoin[0]?.name ?? null)
      : (branchJoin?.name ?? null)

    const pendingApproval =
      row.status === "inactive" && row.role === "employee"
    const needsBranch =
      row.status === "active" &&
      row.role === "employee" &&
      row.branch_id === null
    let displayStatus: EmployeeRow["displayStatus"] = row.status
    if (pendingApproval) displayStatus = "pending_approval"
    else if (needsBranch) displayStatus = "onboarding"
    else if (
      row.status === "active" &&
      row.probation_end !== null &&
      row.probation_end >= today
    ) {
      displayStatus = "probation"
    }
    return {
      id: row.id as string,
      employee_code: (row.employee_code as string | null) ?? null,
      line_user_id: (row.line_user_id as string | null) ?? null,
      name: row.name as string,
      position: (row.position as string | null) ?? null,
      department: (row.department as string | null) ?? null,
      role: row.role as string,
      branch_id: (row.branch_id as string | null) ?? null,
      branch_name,
      salary: row.salary != null ? Number(row.salary) : null,
      status: row.status as "active" | "inactive",
      contract_start: (row.contract_start as string | null) ?? null,
      contract_file_path: (row.contract_file_path as string | null) ?? null,
      probation_end: (row.probation_end as string | null) ?? null,
      visa_expiry: (row.visa_expiry as string | null) ?? null,
      avatar_path: (row.avatar_path as string | null) ?? null,
      avatarUrl: employeeAvatarPublicUrl((row.avatar_path as string | null) ?? null),
      displayStatus,
    }
  })

  return { employees, total: count ?? 0, today }
}

/** Self-registrations awaiting HR approval + active employees missing branch */
export async function getOnboardingPendingCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from("hr_employees")
    .select("id", { count: "exact", head: true })
    .or(ONBOARDING_PENDING_OR_FILTER)
  if (error) throw error
  return count ?? 0
}

export async function getBranchesForFilter(): Promise<BranchFilterOption[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_branches")
    .select("id, name")
    .order("name")

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }))
}

export async function getDepartments(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_employees")
    .select("department")
    .not("department", "is", null)

  if (error) {
    throw error
  }
  return [...new Set((data ?? []).map((r) => r.department as string))].sort()
}
