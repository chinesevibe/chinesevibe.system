import type { SupabaseClient } from "@supabase/supabase-js"

import { getAdminClient } from "@/lib/auth/admin-client"
import { isHeadOfficeBranchCode } from "@/lib/branches/head-office"
import {
  GEOFENCE_MAX_RADIUS_M,
  validateGeofence,
  type GeofenceResult,
} from "@/lib/geofence/validate"

export type BranchGeofenceConfig = {
  latitude: number | null
  longitude: number | null
  geofence_radius_m: number
  geofence_enabled: boolean
}

export type BranchGeofenceAssertResult =
  | GeofenceResult
  | { ok: false; reason: "branch_not_found" }

export async function loadBranchGeofence(
  admin: SupabaseClient,
  branchId: string
): Promise<BranchGeofenceConfig | null> {
  const { data, error } = await admin
    .from("hr_branches")
    .select("code, latitude, longitude, geofence_radius_m, geofence_enabled")
    .eq("id", branchId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const headOffice = isHeadOfficeBranchCode(data.code as string | null)

  return {
    latitude: data.latitude != null ? Number(data.latitude) : null,
    longitude: data.longitude != null ? Number(data.longitude) : null,
    geofence_radius_m: Number(data.geofence_radius_m ?? GEOFENCE_MAX_RADIUS_M),
    geofence_enabled: headOffice
      ? false
      : Boolean(data.geofence_enabled ?? true),
  }
}

export async function assertWithinBranchGeofence({
  branchId,
  latitude,
  longitude,
  admin = getAdminClient(),
}: {
  branchId: string
  latitude: number
  longitude: number
  admin?: SupabaseClient
}): Promise<BranchGeofenceAssertResult> {
  const config = await loadBranchGeofence(admin, branchId)
  if (!config) {
    return { ok: false, reason: "branch_not_found" }
  }

  return validateGeofence({
    branchLat: config.latitude,
    branchLng: config.longitude,
    radiusM: config.geofence_radius_m,
    enabled: config.geofence_enabled,
    userLat: latitude,
    userLng: longitude,
  })
}

export function isBranchGeofenceReady(branch: {
  code?: string | null
  latitude: number | null
  longitude: number | null
  geofence_enabled?: boolean | null
}): boolean {
  if (isHeadOfficeBranchCode(branch.code)) return false
  return (
    branch.latitude != null &&
    branch.longitude != null &&
    branch.geofence_enabled !== false
  )
}
