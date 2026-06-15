import { NextResponse } from "next/server"

import { submitDailyAttendance } from "@/lib/attendance/submit-daily"
import { getCurrentEmployee } from "@/lib/auth/session"

export async function POST() {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active" || !employee.line_user_id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const result = await submitDailyAttendance({ lineUserId: employee.line_user_id })

  switch (result.status) {
    case "success":
      return NextResponse.json({
        ok: true,
        message: "บันทึกเวลาเรียบร้อยแล้ว",
      })
    case "already_submitted":
      return NextResponse.json({
        ok: true,
        message: "บันทึกเวลาเรียบร้อยแล้ว ไม่ต้องยื่นซ้ำ",
      })
    case "not_checked_in":
      return NextResponse.json({ error: "ยังไม่มีการเช็คอินวันนี้" }, { status: 400 })
    case "not_checked_out":
      return NextResponse.json({ error: "กรุณาเช็คเอาท์ก่อนบันทึกเวลา" }, { status: 400 })
    case "not_registered":
      return NextResponse.json({ error: "not registered" }, { status: 404 })
    case "pending_approval":
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
}
