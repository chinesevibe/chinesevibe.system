import { isHeadOfficeBranchCode } from "@/lib/branches/head-office"
import { isBranchGeofenceReady } from "@/lib/geofence/branch-geofence"

export type BranchGeofenceFields = {
  code?: string | null
  latitude: number | null
  longitude: number | null
  geofence_enabled?: boolean | null
}

export function branchGeofenceReady(branch: BranchGeofenceFields): boolean {
  return isBranchGeofenceReady(branch)
}

export function branchGeofenceLabel(branch: BranchGeofenceFields): string {
  if (isHeadOfficeBranchCode(branch.code)) return "ไม่ใช้ Geofence"
  return branchGeofenceReady(branch) ? "Geofence 200m" : "ยังไม่ตั้ง Geofence"
}

export function branchGeofenceBadgeText(branch: BranchGeofenceFields): string {
  if (isHeadOfficeBranchCode(branch.code)) {
    return "Head Office — เช็คอิน/ออกไม่จำกัดจุด"
  }
  return branchGeofenceReady(branch)
    ? "Geofence 200m พร้อมใช้"
    : "ยังไม่ตั้ง Geofence — เช็คอินไม่จำกัดระยะ"
}
