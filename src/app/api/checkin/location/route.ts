import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { verifyCheckinToken } from "@/lib/checkin/qr-token"

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 })
  }

  const verification = verifyCheckinToken(token)
  if (!verification.valid) {
    return NextResponse.json({ error: verification.reason }, { status: 401 })
  }

  const admin = getAdminClient()

  const { data: employee } = await admin
    .from("hr_employees")
    .select("branch_id")
    .eq("id", verification.employeeId)
    .eq("status", "active")
    .maybeSingle()

  if (!employee?.branch_id) {
    return NextResponse.json({ error: "no_branch" }, { status: 404 })
  }

  const { data: branch } = await admin
    .from("hr_branches")
    .select("name, latitude, longitude, geofence_radius_m, geofence_enabled")
    .eq("id", employee.branch_id)
    .maybeSingle()

  if (!branch?.latitude || !branch?.longitude) {
    return NextResponse.json({ error: "no_location" }, { status: 404 })
  }

  return NextResponse.json({
    branchName: branch.name as string,
    latitude: Number(branch.latitude),
    longitude: Number(branch.longitude),
    geofenceRadiusM: (branch.geofence_radius_m as number | null) ?? 100,
    geofenceEnabled: (branch.geofence_enabled as boolean | null) ?? true,
  })
}
