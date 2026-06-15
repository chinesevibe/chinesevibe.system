import { NextResponse, type NextRequest } from "next/server"

import { createAttendanceByHr } from "@/lib/attendance/hr-manage"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

type CreateBody = {
  employeeId?: string
  date?: string
  checkInTime?: string
  checkOutTime?: string | null
  workHours?: number | null
  workShiftId?: string | null
}

export async function POST(request: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: CreateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (!body.employeeId || !body.date || !body.checkInTime) {
    return NextResponse.json(
      { error: "กรุณาระบุพนักงาน วันที่ และเวลาเข้า" },
      { status: 400 }
    )
  }

  try {
    const row = await createAttendanceByHr(body.employeeId, {
      date: body.date,
      checkInTime: body.checkInTime,
      checkOutTime: body.checkOutTime,
      workHours: body.workHours,
      workShiftId:
        typeof body.workShiftId === "string" && body.workShiftId.trim() !== ""
          ? body.workShiftId.trim()
          : null,
    })
    return NextResponse.json({ id: row.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
