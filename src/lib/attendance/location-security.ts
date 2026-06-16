import { getAdminClient } from "@/lib/auth/admin-client"
import { assertWithinBranchGeofence } from "@/lib/geofence/branch-geofence"
import { distanceMeters } from "@/lib/geofence/validate"

const MAX_LIFF_ACCURACY_M = 80
const MAX_LOCATION_AGE_MS = 2 * 60 * 1000
const MIN_TRAVEL_DISTANCE_M = 10_000
const MAX_REASONABLE_TRAVEL_SPEED_KMH = 180

export type AttendanceLocationSource =
  | "liff_geolocation"
  | "line_location_message"
  | "unknown"

export type AttendanceLocationInput = {
  latitude: number
  longitude: number
  address?: string
  accuracy_m?: number | null
  captured_at?: string | null
  source?: AttendanceLocationSource | null
  is_mocked?: boolean | null
  speed_mps?: number | null
  heading?: number | null
  device_platform?: string | null
}

export type AttendanceLocationReviewStatus =
  | "clear"
  | "pending_hr"
  | "approved"
  | "rejected"

export type AttendanceLocationDecision =
  | {
      status: "clear"
      payload: Record<string, unknown>
      distanceM: number | null
      limitM: number | null
      flags: string[]
    }
  | {
      status: "outside_geofence"
      payload: Record<string, unknown>
      distanceM: number
      limitM: number
      flags: string[]
    }
  | {
      status: "suspicious_location"
      payload: Record<string, unknown>
      distanceM: number | null
      limitM: number | null
      flags: string[]
    }

function normalizedSource(source: AttendanceLocationInput["source"]): AttendanceLocationSource {
  if (source === "liff_geolocation" || source === "line_location_message") return source
  return "unknown"
}

function parseCapturedAt(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function mapFlagLabel(flag: string): string {
  switch (flag) {
    case "mock_detected":
      return "ตรวจพบ mock location"
    case "poor_accuracy":
      return "ความแม่นยำ GPS ต่ำ"
    case "stale_location":
      return "ตำแหน่งเก่าเกินเกณฑ์"
    case "missing_accuracy":
      return "ไม่มีข้อมูลความแม่นยำ GPS"
    case "missing_timestamp":
      return "ไม่มีเวลาที่เก็บตำแหน่ง"
    case "accuracy_wider_than_geofence":
      return "รัศมีความคลาดเคลื่อนกว้างเกินพื้นที่สาขา"
    case "impossible_travel":
      return "ตรวจพบการเคลื่อนที่ผิดธรรมชาติ"
    default:
      return flag
  }
}

export function suspiciousLocationMessage(flags: string[]): string {
  const labels = flags.map(mapFlagLabel)
  const detail = labels.length > 0 ? ` (${labels.join(", ")})` : ""
  return `ระบบตรวจพบว่าตำแหน่งน่าสงสัย${detail} จึงส่งให้ HR ตรวจสอบก่อนอนุมัติ`
}

function parseLocationPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
  const row = payload as Record<string, unknown>
  const latitude = Number(row.latitude)
  const longitude = Number(row.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const capturedAt = typeof row.captured_at === "string" ? row.captured_at : null
  return {
    latitude,
    longitude,
    capturedAt: parseCapturedAt(capturedAt),
    timestamp: capturedAt,
  }
}

async function detectImpossibleTravel({
  employeeId,
  currentLatitude,
  currentLongitude,
  capturedAt,
}: {
  employeeId: string
  currentLatitude: number
  currentLongitude: number
  capturedAt: Date
}): Promise<boolean> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_attendance")
    .select("check_in_at, check_in_location, check_out_at, check_out_location")
    .eq("employee_id", employeeId)
    .lt("check_in_at", capturedAt.toISOString())
    .order("check_in_at", { ascending: false })
    .limit(5)

  if (error) throw error

  for (const row of data ?? []) {
    const previous =
      parseLocationPayload(row.check_out_location) ??
      parseLocationPayload(row.check_in_location)
    if (!previous) continue

    const previousAt =
      previous.capturedAt ??
      (row.check_out_at ? new Date(row.check_out_at as string) : new Date(row.check_in_at as string))
    const elapsedHours = (capturedAt.getTime() - previousAt.getTime()) / 3_600_000
    if (!Number.isFinite(elapsedHours) || elapsedHours <= 0) continue

    const travelDistanceM = distanceMeters(
      previous.latitude,
      previous.longitude,
      currentLatitude,
      currentLongitude,
    )
    if (travelDistanceM < MIN_TRAVEL_DISTANCE_M) continue

    const speedKmh = travelDistanceM / 1000 / elapsedHours
    if (speedKmh > MAX_REASONABLE_TRAVEL_SPEED_KMH) {
      return true
    }
  }

  return false
}

export function mergeLocationFlags(...groups: Array<string[] | null | undefined>) {
  return Array.from(new Set(groups.flatMap((group) => group ?? []).filter(Boolean)))
}

export async function evaluateAttendanceLocation({
  employeeId,
  branchId,
  location,
  now = new Date(),
}: {
  employeeId: string
  branchId: string | null
  location: AttendanceLocationInput
  now?: Date
}): Promise<AttendanceLocationDecision> {
  const flags: string[] = []
  const source = normalizedSource(location.source)
  const capturedAt = parseCapturedAt(location.captured_at ?? null)

  if (location.is_mocked) {
    flags.push("mock_detected")
  }

  if (source === "liff_geolocation") {
    if (location.accuracy_m == null || !Number.isFinite(location.accuracy_m)) {
      flags.push("missing_accuracy")
    } else if (location.accuracy_m > MAX_LIFF_ACCURACY_M) {
      flags.push("poor_accuracy")
    }

    if (!capturedAt) {
      flags.push("missing_timestamp")
    } else if (now.getTime() - capturedAt.getTime() > MAX_LOCATION_AGE_MS) {
      flags.push("stale_location")
    }
  }

  let distanceM: number | null = null
  let limitM: number | null = null

  if (branchId) {
    const geofence = await assertWithinBranchGeofence({
      branchId,
      latitude: location.latitude,
      longitude: location.longitude,
    })

    if (!geofence.ok && geofence.reason === "outside") {
      distanceM = geofence.distanceM
      limitM = geofence.limitM
      const payload = {
        ...location,
        source,
        captured_at: capturedAt?.toISOString() ?? location.captured_at ?? null,
        branch_distance_m: distanceM,
        geofence_limit_m: limitM,
        suspicious_flags: flags,
      }
      return {
        status: "outside_geofence",
        payload,
        distanceM,
        limitM,
        flags,
      }
    }

    if (geofence.ok && "distanceM" in geofence) {
      distanceM = geofence.distanceM
    }
  }

  if (
    source === "liff_geolocation" &&
    location.accuracy_m != null &&
    limitM != null &&
    location.accuracy_m > limitM
  ) {
    flags.push("accuracy_wider_than_geofence")
  }

  if (capturedAt) {
    const impossibleTravel = await detectImpossibleTravel({
      employeeId,
      currentLatitude: location.latitude,
      currentLongitude: location.longitude,
      capturedAt,
    })
    if (impossibleTravel) {
      flags.push("impossible_travel")
    }
  }

  const payload = {
    ...location,
    source,
    captured_at: capturedAt?.toISOString() ?? location.captured_at ?? null,
    branch_distance_m: distanceM,
    geofence_limit_m: limitM,
    suspicious_flags: flags,
  }

  if (flags.length > 0) {
    return {
      status: "suspicious_location",
      payload,
      distanceM,
      limitM,
      flags,
    }
  }

  return {
    status: "clear",
    payload,
    distanceM,
    limitM,
    flags,
  }
}
