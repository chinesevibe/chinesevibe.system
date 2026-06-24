import { NextResponse, type NextRequest } from "next/server"

import { decideAttendanceLocation } from "@/lib/approval/attendance-location-decide"
import {
  deleteAttendanceByHr,
  updateAttendanceByHr,
} from "@/lib/attendance/hr-manage"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

type PatchBody = {
  date?: string
  checkInTime?: string
  checkOutTime?: string | null
  workHours?: number | null
  workShiftId?: string | null
  reason?: string | null
}

type ReviewBody = {
  action?: "approve" | "reject"
  note?: string
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (!body.date || !body.checkInTime) {
    return NextResponse.json(
      { error: "กรุณาระบุวันที่และเวลาเข้า" },
      { status: 400 }
    )
  }

  try {
    const row = await updateAttendanceByHr(id, {
      date: body.date,
      checkInTime: body.checkInTime,
      checkOutTime: body.checkOutTime,
      workHours: body.workHours,
      workShiftId:
        typeof body.workShiftId === "string" && body.workShiftId.trim() !== ""
          ? body.workShiftId.trim()
          : null,
    }, {
      actorEmployeeId: caller.id,
      reason: typeof body.reason === "string" ? body.reason : null,
    })
    return NextResponse.json({ id: row.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params

  try {
    await deleteAttendanceByHr(id, {
      actorEmployeeId: caller.id,
      reason: "Deleted from HR attendance admin",
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : "ลบไม่สำเร็จ"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  let body: ReviewBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }

  const result = await decideAttendanceLocation({
    attendanceId: id,
    action: body.action,
    approverId: caller.id,
    note: body.note,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true, status: result.status })
}
