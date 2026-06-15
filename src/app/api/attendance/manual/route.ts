import { NextResponse } from "next/server"

import {
  saveManualAttendance,
  type ManualAttendancePayload,
} from "@/lib/attendance/manual"
import { getCurrentEmployee } from "@/lib/auth/session"

export async function POST(request: Request) {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active" || !employee.line_user_id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: Omit<ManualAttendancePayload, "employeeId">
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const date = typeof body.date === "string" ? body.date : undefined
  const mode =
    body.mode === "checkin" || body.mode === "checkout" || body.mode === "full"
      ? body.mode
      : undefined
  const checkInTime =
    typeof body.checkInTime === "string" ? body.checkInTime.trim() : undefined
  const checkOutTime =
    typeof body.checkOutTime === "string" ? body.checkOutTime.trim() : undefined

  if (!date || !mode) {
    return NextResponse.json(
      { error: "กรุณาระบุวันที่และประเภทการบันทึก" },
      { status: 400 }
    )
  }

  if (mode !== "checkout" && !checkInTime) {
    return NextResponse.json({ error: "กรุณาระบุเวลาเข้า" }, { status: 400 })
  }

  if ((mode === "checkout" || mode === "full") && !checkOutTime) {
    return NextResponse.json({ error: "กรุณาระบุเวลาเลิกงาน" }, { status: 400 })
  }

  const shiftId =
    typeof body.shiftId === "string" && body.shiftId.trim() !== ""
      ? body.shiftId.trim()
      : null

  try {
    const result = await saveManualAttendance({
      employeeId: employee.id,
      date,
      mode,
      checkInTime: checkInTime,
      checkOutTime: checkOutTime,
      shiftId,
    })

    return NextResponse.json({
      ok: true,
      id: result.id,
      status: result.status,
      message:
        result.status === "both_saved"
          ? "บันทึกเวลาเข้าและออกเรียบร้อย"
          : result.status === "checkin_saved"
            ? "บันทึกเวลาเข้าเรียบร้อย"
            : "บันทึกเวลาออกเรียบร้อย",
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" },
      { status: 400 }
    )
  }
}
