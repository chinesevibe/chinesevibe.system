import type { SupabaseClient } from "@supabase/supabase-js"

import type { BranchDetail } from "@/features/branches/branch-hub-data"
import type { BranchRow } from "@/features/branches/data"
import { branchAdminPath, isBranchUuid } from "@/lib/branches/branch-slug"
import { isHeadOfficeBranchCode } from "@/lib/branches/head-office"

type BranchCore = {
  id: string
  name: string
  code: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius_m: number
  geofence_enabled: boolean
  manager_employee_id: string | null
}

const BRANCH_SELECT =
  "id, name, code, address, latitude, longitude, geofence_radius_m, geofence_enabled, manager_employee_id"

/** Minimal branch fields for employee forms — avoids hard dependency on geofence migrations. */
const BRANCH_FORM_SELECT =
  "id, name, code, address, manager_employee_id"

function parseBranchRow(
  row: Record<string, unknown>,
  options?: { includeGeofence?: boolean }
): BranchCore {
  const includeGeofence = options?.includeGeofence !== false
  const code = (row.code as string | null) ?? null
  return {
    id: row.id as string,
    name: row.name as string,
    code,
    address: (row.address as string | null) ?? null,
    latitude:
      includeGeofence && row.latitude != null && row.latitude !== ""
        ? Number(row.latitude)
        : null,
    longitude:
      includeGeofence && row.longitude != null && row.longitude !== ""
        ? Number(row.longitude)
        : null,
    geofence_radius_m: includeGeofence
      ? ((row.geofence_radius_m as number) ?? 200)
      : 200,
    geofence_enabled: includeGeofence
      ? isHeadOfficeBranchCode(code)
        ? false
        : ((row.geofence_enabled as boolean) ?? true)
      : true,
    manager_employee_id: (row.manager_employee_id as string | null) ?? null,
  }
}

export async function loadManagerName(
  supabase: SupabaseClient,
  managerEmployeeId: string | null
): Promise<string | null> {
  if (!managerEmployeeId) return null
  const { data, error } = await supabase
    .from("hr_employees")
    .select("name")
    .eq("id", managerEmployeeId)
    .maybeSingle()
  if (error) return null
  return (data?.name as string | undefined) ?? null
}

function mapBranchCore(row: BranchCore): BranchCore {
  return { ...row }
}

export async function fetchBranchBySlug(
  supabase: SupabaseClient,
  slugParam: string
): Promise<BranchDetail | null> {
  const decoded = decodeURIComponent(slugParam)

  if (isBranchUuid(decoded)) {
    return fetchBranchById(supabase, decoded)
  }

  const { data, error } = await supabase
    .from("hr_branches")
    .select(BRANCH_SELECT)
    .order("name")

  if (error) throw error

  const normalized = decodeURIComponent(slugParam)
  const match = (data ?? []).find((row) => {
    const path = branchAdminPath(row as BranchCore)
    return (
      path === `/admin/branch/${slugParam}` ||
      path === `/admin/branch/${normalized}` ||
      path === `/admin/branch/${encodeURIComponent(normalized)}`
    )
  })

  if (!match) return null
  return fetchBranchById(supabase, match.id as string)
}

export async function fetchBranchById(
  supabase: SupabaseClient,
  branchId: string
): Promise<BranchDetail | null> {
  const { data, error } = await supabase
    .from("hr_branches")
    .select(BRANCH_SELECT)
    .eq("id", branchId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const core = mapBranchCore(parseBranchRow(data as Record<string, unknown>))
  const manager_name = await loadManagerName(supabase, core.manager_employee_id)

  return { ...core, manager_name }
}

export async function fetchAllBranches(
  supabase: SupabaseClient,
  options?: { forForms?: boolean }
): Promise<BranchRow[]> {
  const includeGeofence = !options?.forForms
  const { data, error } = options?.forForms
    ? await supabase
        .from("hr_branches")
        .select(BRANCH_FORM_SELECT)
        .order("name")
    : await supabase
        .from("hr_branches")
        .select(BRANCH_SELECT)
        .order("name")

  if (error) throw error

  const rows = (data ?? []).map((row) =>
    parseBranchRow(row as unknown as Record<string, unknown>, {
      includeGeofence,
    })
  )
  const managerIds = [
    ...new Set(
      rows
        .map((r) => r.manager_employee_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ]

  const managerNames = new Map<string, string>()
  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("hr_employees")
      .select("id, name")
      .in("id", managerIds)
    for (const m of managers ?? []) {
      managerNames.set(m.id as string, m.name as string)
    }
  }

  return rows.map((row) => ({
    ...mapBranchCore(row),
    manager_name: row.manager_employee_id
      ? (managerNames.get(row.manager_employee_id) ?? null)
      : null,
  }))
}
