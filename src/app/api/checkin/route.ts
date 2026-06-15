import { NextResponse, type NextRequest } from "next/server"

import { checkIn } from "@/lib/attendance/check-in"
import { formatIctTime } from "@/lib/attendance/late"
import { getAdminClient } from "@/lib/auth/admin-client"
import { verifyCheckinToken } from "@/lib/checkin/qr-token"

function outsideGeofenceMessage(distanceM: number, limitM: number): string {
  const dist = Math.round(distanceM)
  return `คุณอยู่นอกพื้นที่สาขา (${dist} เมตร จากจุดศูนย์ จำกัด ${limitM}m) กรุณาเข้าใกล้สาขาแล้วลองใหม่`
}

// QR check-in: verifies the day-bound token, then runs the same T07
// pipeline (duplicate guard + late calc) — imported, never modified.
export async function POST(request: NextRequest) {
  let body: { token?: string; latitude?: number; longitude?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (typeof body.token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 })
  }
  // Geolocation is mandatory (Q-T11-3, consistent with T07).
  if (
    typeof body.latitude !== "number" ||
    typeof body.longitude !== "number" ||
    !Number.isFinite(body.latitude) ||
    !Number.isFinite(body.longitude)
  ) {
    return NextResponse.json(
      { error: "latitude/longitude are required" },
      { status: 400 }
    )
  }

  const verification = verifyCheckinToken(body.token)
  if (!verification.valid) {
    const status = verification.reason === "expired" ? 410 : 401
    return NextResponse.json({ error: verification.reason }, { status })
  }

  const { data: employee } = await getAdminClient()
    .from("hr_employees")
    .select("line_user_id")
    .eq("id", verification.employeeId)
    .eq("status", "active")
    .maybeSingle()

  if (!employee?.line_user_id) {
    return NextResponse.json({ error: "not_registered" }, { status: 404 })
  }

  const result = await checkIn({
    lineUserId: employee.line_user_id,
    location: { latitude: body.latitude, longitude: body.longitude },
  })

  switch (result.status) {
    case "success":
      return NextResponse.json({
        status: "success",
        employeeName: result.employeeName,
        timeText: formatIctTime(result.checkInAt),
        lateMinutes: result.lateMinutes,
      })
    case "already_checked_in":
      return NextResponse.json({
        status: "already_checked_in",
        timeText: formatIctTime(result.checkInAt),
      })
    case "outside_geofence":
      return NextResponse.json(
        {
          error: "outside_geofence",
          distanceM: result.distanceM,
          limitM: result.limitM,
          message: outsideGeofenceMessage(result.distanceM, result.limitM),
        },
        { status: 403 }
      )
    case "pending_approval":
      return NextResponse.json({ error: "pending_approval" }, { status: 403 })
    case "not_registered":
      return NextResponse.json({ error: "not_registered" }, { status: 404 })
  }
}
