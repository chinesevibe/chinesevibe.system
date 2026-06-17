import { isHeadOfficeBranchCode } from "@/lib/branches/head-office"
import { isBranchGeofenceReady } from "@/lib/geofence/branch-geofence"
import { GEOFENCE_MAX_RADIUS_M } from "@/lib/geofence/validate"

export type BranchGeofenceFields = {
  code?: string | null
  latitude: number | null
  longitude: number | null
  geofence_enabled?: boolean | null
  geofence_radius_m?: number | null
}

function displayRadiusM(branch: BranchGeofenceFields): number {
  const radius = branch.geofence_radius_m
  if (typeof radius === "number" && radius > 0) {
    return Math.min(radius, GEOFENCE_MAX_RADIUS_M)
  }
  return GEOFENCE_MAX_RADIUS_M
}

export function branchGeofenceReady(branch: BranchGeofenceFields): boolean {
  return isBranchGeofenceReady(branch)
}

export function branchGeofenceLabel(branch: BranchGeofenceFields): string {
  if (isHeadOfficeBranchCode(branch.code)) return "ไม่ใช้ Geofence"
  const radiusM = displayRadiusM(branch)
  return branchGeofenceReady(branch)
    ? `Geofence ${radiusM}m`
    : "ยังไม่ตั้ง Geofence"
}

export function branchGeofenceBadgeText(branch: BranchGeofenceFields): string {
  if (isHeadOfficeBranchCode(branch.code)) {
    return "Head Office — เช็คอิน/ออกไม่จำกัดจุด"
  }
  const radiusM = displayRadiusM(branch)
  return branchGeofenceReady(branch)
    ? `Geofence ${radiusM}m พร้อมใช้`
    : "ยังไม่ตั้ง Geofence — เช็คอินไม่จำกัดระยะ"
}
