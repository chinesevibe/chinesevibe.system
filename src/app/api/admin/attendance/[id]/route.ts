import { NextResponse, type NextRequest } from "next/server"

import { finalizeAttendanceRecord } from "@/lib/attendance/finalize-attendance-record"
import {
  deleteAttendanceByHr,
  updateAttendanceByHr,
} from "@/lib/attendance/hr-manage"
import { getAdminClient } from "@/lib/auth/admin-client"
import { EMPLOYEE_VIA_ATTENDANCE } from "@/lib/supabase/employee-embeds"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

type PatchBody = {
  date?: string
  checkInTime?: string
  checkOutTime?: string | null
  workHours?: number | null
  workShiftId?: string | null
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
    await deleteAttendanceByHr(id)
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

  const note = body.note?.trim() ?? ""
  if (body.action === "reject" && note.length < 3) {
    return NextResponse.json(
      { error: "กรุณาระบุเหตุผลการปฏิเสธพิกัด" },
      { status: 400 }
    )
  }

  const admin = getAdminClient()

  const { data: row, error: loadError } = await admin
    .from("hr_attendance")
    .select(
      `id, employee_id, shift_date, work_hours, check_out_at, location_review_status, ${EMPLOYEE_VIA_ATTENDANCE}!inner(branch_id)`
    )
    .eq("id", id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 400 })
  }
  if (!row) {
    return NextResponse.json({ error: "ไม่พบรายการเข้างาน" }, { status: 404 })
  }

  const currentStatus = (row.location_review_status as string | null) ?? "clear"
  if (currentStatus !== "pending_hr") {
    return NextResponse.json(
      { error: "รายการนี้ไม่ได้อยู่ระหว่างรอ HR ตรวจพิกัด" },
      { status: 409 }
    )
  }

  const reviewedAt = new Date().toISOString()
  const updatePayload =
    body.action === "approve"
      ? {
          location_review_status: "approved",
          location_review_note: note || "HR อนุมัติพิกัด",
          location_reviewed_by: caller.id,
          location_reviewed_at: reviewedAt,
        }
      : {
          location_review_status: "rejected",
          location_review_note: note,
          location_reviewed_by: caller.id,
          location_reviewed_at: reviewedAt,
        }

  const { error: updateError } = await admin
    .from("hr_attendance")
    .update(updatePayload)
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  if (
    body.action === "approve" &&
    row.check_out_at &&
    typeof row.work_hours === "number" &&
    row.work_hours > 0
  ) {
    try {
      await finalizeAttendanceRecord({
        attendanceId: row.id as string,
        employeeId: row.employee_id as string,
        branchId:
          (row.hr_employees as { branch_id?: string | null } | null)?.branch_id ?? null,
        workDate: (row.shift_date as string | null) ?? undefined,
        workHours: row.work_hours,
      })
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "อนุมัติพิกัดแล้ว แต่ finalize attendance ไม่สำเร็จ"
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  return NextResponse.json({
    ok: true,
    status: body.action === "approve" ? "approved" : "rejected",
  })
}
