import type { OrgDepartment } from "@/features/organization/master-data"

export function departmentsForBranch(
  departments: OrgDepartment[],
  branchId: string
): OrgDepartment[] {
  if (!branchId) return []
  const scoped = departments.filter((department) => department.branch_id === branchId)
  // ponytail: fallback keeps forms usable when org rows are not branch-scoped yet
  return scoped.length > 0 ? scoped : departments
}
