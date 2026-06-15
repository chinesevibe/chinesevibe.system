export const GEOFENCE_MAX_RADIUS_M = 200

const EARTH_RADIUS_M = 6_371_000

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Haversine distance in meters between two WGS84 points. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

export type GeofenceResult =
  | { ok: true; distanceM: number }
  | { ok: false; reason: "outside"; distanceM: number; limitM: number }
  | { ok: true; skipped: true; reason: "not_configured" | "disabled" }

export function validateGeofence({
  branchLat,
  branchLng,
  radiusM,
  enabled,
  userLat,
  userLng,
}: {
  branchLat: number | null
  branchLng: number | null
  radiusM: number
  enabled: boolean
  userLat: number
  userLng: number
}): GeofenceResult {
  if (branchLat == null || branchLng == null) {
    return { ok: true, skipped: true, reason: "not_configured" }
  }
  if (!enabled) {
    return { ok: true, skipped: true, reason: "disabled" }
  }

  const distanceM = distanceMeters(branchLat, branchLng, userLat, userLng)
  const limitM = Math.min(radiusM, GEOFENCE_MAX_RADIUS_M)

  if (distanceM > limitM) {
    return { ok: false, reason: "outside", distanceM, limitM }
  }

  return { ok: true, distanceM }
}
