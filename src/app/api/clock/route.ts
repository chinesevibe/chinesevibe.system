import { NextResponse, type NextRequest } from "next/server"

import { getCurrentEmployee } from "@/lib/auth/session"
import { checkIn } from "@/lib/attendance/check-in"
import { checkOut } from "@/lib/attendance/check-out"

export async function POST(request: NextRequest) {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active" || !employee.line_user_id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    action: "checkin" | "checkout"
    latitude: number
    longitude: number
    accuracy_m: number
    captured_at?: string
  }

  const { action, latitude, longitude, accuracy_m, captured_at } = body
  if (action !== "checkin" && action !== "checkout") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 })
  }

  const location = {
    latitude,
    longitude,
    accuracy_m: accuracy_m ?? null,
    captured_at: captured_at ?? new Date().toISOString(),
    source: "liff_geolocation" as const,
    speed_mps: null,
    heading: null,
    device_platform: null,
  }

  const lineUserId = employee.line_user_id as string

  if (action === "checkin") {
    const result = await checkIn({ lineUserId, location })

    switch (result.status) {
      case "success":
        return NextResponse.json({
          status: "success",
          employeeName: result.employeeName,
          checkInAt: result.checkInAt.toISOString(),
          lateMinutes: result.lateMinutes,
          monthSummary: result.monthSummary,
          timeText: result.checkInAt.toLocaleTimeString("th-TH", {
            hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
          }),
        })
      case "already_checked_in":
        return NextResponse.json({
          status: "already_checked_in",
          checkInAt: result.checkInAt.toISOString(),
          timeText: result.checkInAt.toLocaleTimeString("th-TH", {
            hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
          }),
        })
      case "requires_retro_checkout":
        return NextResponse.json(
          {
            error: "requires_retro_checkout",
            checkInAt: result.checkInAt.toISOString(),
            cutoffAt: result.cutoffAt.toISOString(),
            timeText: result.checkInAt.toLocaleTimeString("th-TH", {
              hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
            }),
          },
          { status: 409 }
        )
      case "too_soon_after_checkout":
        return NextResponse.json(
          {
            error: "too_soon_after_checkout",
            nextCheckInAt: result.nextCheckInAt.toISOString(),
            timeText: result.nextCheckInAt.toLocaleTimeString("th-TH", {
              hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
            }),
          },
          { status: 409 }
        )
      case "outside_geofence":
        return NextResponse.json(
          { error: "outside_geofence", distanceM: result.distanceM, limitM: result.limitM },
          { status: 403 }
        )
      case "suspicious_location":
        return NextResponse.json({
          status: "success",
          employeeName: employee.name,
          checkInAt: new Date().toISOString(),
          lateMinutes: 0,
          timeText: new Date().toLocaleTimeString("th-TH", {
            hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
          }),
          warning: result.message,
        })
      case "pending_approval":
        return NextResponse.json({ error: "pending_approval" }, { status: 403 })
      case "not_registered":
        return NextResponse.json({ error: "not_registered" }, { status: 404 })
    }
  }

  // action === "checkout"
  const result = await checkOut({ lineUserId, location })

  switch (result.status) {
    case "success":
      return NextResponse.json({
        status: "success",
        employeeName: result.employeeName,
        checkInAt: result.checkInAt.toISOString(),
        checkOutAt: result.checkOutAt.toISOString(),
        workMinutes: result.workMinutes,
        monthSummary: result.monthSummary,
        timeText: result.checkOutAt.toLocaleTimeString("th-TH", {
          hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
        }),
      })
    case "already_checked_out":
      return NextResponse.json({
        status: "already_checked_out",
        checkOutAt: result.checkOutAt.toISOString(),
        timeText: result.checkOutAt.toLocaleTimeString("th-TH", {
          hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
        }),
      })
    case "not_checked_in":
      return NextResponse.json({ error: "not_checked_in" }, { status: 400 })
    case "outside_geofence":
      return NextResponse.json(
        { error: "outside_geofence", distanceM: result.distanceM, limitM: result.limitM },
        { status: 403 }
      )
    case "suspicious_location":
      return NextResponse.json({
        status: "success",
        employeeName: employee.name,
        checkOutAt: new Date().toISOString(),
        workMinutes: 0,
        timeText: new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok",
        }),
        warning: result.message,
      })
    case "pending_approval":
      return NextResponse.json({ error: "pending_approval" }, { status: 403 })
    case "not_registered":
      return NextResponse.json({ error: "not_registered" }, { status: 404 })
  }
}
