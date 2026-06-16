import { NextResponse, type NextRequest } from "next/server"

import {
  canRequestLeave,
  insufficientBalanceMessage,
  snapshotFromRow,
} from "@/features/leave/balance"
import {
  countLeaveDays,
  LEAVE_TYPES,
  type LeaveType,
} from "@/features/leave/types"
import { expiresAtFrom } from "@/lib/approval/types"
import { requiresMedicalCertificate, validateRetroactiveSickLeave } from "@/lib/leave/validation"
import { getCurrentEmployee } from "@/lib/auth/session"
import {
  leaveSubmitConfirmFlex,
  leaveSubmitHrNotifyFlex,
} from "@/lib/line/flex/leave-request"
import { notifyHr, pushToLineUser } from "@/lib/line/notify-hr"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"]

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)
}

export async function POST(request: NextRequest) {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const form = await request.formData()
  const type = form.get("type")
  const startDate = form.get("startDate")
  const endDate = form.get("endDate")
  const reason = form.get("reason")
  const file = form.get("attachment")
  const leaveHoursRaw = form.get("leaveHours")
  const medicalFile = form.get("medicalCertificate")

  if (
    typeof type !== "string" ||
    !LEAVE_TYPES.includes(type as LeaveType) ||
    typeof startDate !== "string" ||
    typeof endDate !== "string" ||
    typeof reason !== "string" ||
    reason.trim().length < 5
  ) {
    return NextResponse.json({ error: "invalid fields" }, { status: 400 })
  }

  const isSameDay = startDate === endDate
  const leaveHours =
    typeof leaveHoursRaw === "string" && leaveHoursRaw.trim()
      ? Number(leaveHoursRaw)
      : null
  const leaveUnit: "days" | "hours" =
    type === "sick" && isSameDay && leaveHours != null && leaveHours > 0
      ? "hours"
      : "days"

  const days = countLeaveDays(startDate, endDate)
  if (leaveUnit === "days" && (days === null || days < 1)) {
    return NextResponse.json({ error: "invalid date range" }, { status: 400 })
  }
  if (leaveUnit === "hours" && (!leaveHours || leaveHours <= 0 || leaveHours > 24)) {
    return NextResponse.json({ error: "invalid leave hours" }, { status: 400 })
  }

  if (type === "sick") {
    const retroErr = validateRetroactiveSickLeave(startDate)
    if (retroErr) return NextResponse.json({ error: retroErr }, { status: 400 })
  }

  const needsMedical = requiresMedicalCertificate(type, startDate, leaveUnit)
  const certFile =
    medicalFile instanceof File && medicalFile.size > 0
      ? medicalFile
      : file instanceof File && file.size > 0
        ? file
        : null

  if (needsMedical && !certFile) {
    return NextResponse.json(
      { error: "ต้องแนบใบรับรองแพทย์สำหรับลาป่วยนี้" },
      { status: 400 }
    )
  }

  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "invalid file type" }, { status: 400 })
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "file too large" }, { status: 400 })
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let balance = { remaining: 0, total: 0, used: 0 }
  if (leaveUnit === "days") {
    const { data: balanceRow, error: balanceError } = await supabase
      .from("hr_leave_balances")
      .select("total_days, used_days")
      .eq("employee_id", employee.id)
      .eq("leave_type", type)
      .maybeSingle()

    if (balanceError) {
      return NextResponse.json({ error: balanceError.message }, { status: 500 })
    }
    if (!balanceRow) {
      return NextResponse.json(
        {
          error: "no_balance",
          message: "ไม่พบยอดลาสำหรับประเภทนี้ กรุณาติดต่อ HR",
        },
        { status: 400 }
      )
    }

    balance = snapshotFromRow(balanceRow)
    const balanceDays = days ?? 0
    if (!canRequestLeave(balance.remaining, balanceDays)) {
      return NextResponse.json(
        {
          error: "insufficient_balance",
          message: insufficientBalanceMessage(balance.remaining, balanceDays),
        },
        { status: 400 }
      )
    }
  }

  const submittedAt = new Date()
  const { data: leave, error: insertError } = await supabase
    .from("hr_leaves")
    .insert({
      employee_id: employee.id,
      type,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
      status: "pending",
      leave_unit: leaveUnit,
      leave_hours: leaveUnit === "hours" ? leaveHours : null,
      approval_status: "pending_hr",
      submitted_at: submittedAt.toISOString(),
      expires_at: expiresAtFrom(submittedAt).toISOString(),
    })
    .select("id")
    .single()

  if (insertError || !leave) {
    return NextResponse.json(
      { error: insertError?.message ?? "insert failed" },
      { status: 500 }
    )
  }

  let attachmentPath: string | null = null
  let medicalPath: string | null = null

  async function uploadLeaveFile(uploadFile: File, prefix: string) {
    if (!user || !leave) throw new Error("missing context")
    const path = `${user.id}/${leave.id}/${prefix}_${sanitizeFilename(uploadFile.name)}`
    const { error: uploadError } = await supabase.storage
      .from("leave-attachments")
      .upload(path, uploadFile, { contentType: uploadFile.type, upsert: false })
    if (uploadError) throw uploadError
    return path
  }

  try {
    if (file instanceof File && file.size > 0 && file !== certFile) {
      attachmentPath = await uploadLeaveFile(file, "att")
    }
    if (certFile) {
      medicalPath = await uploadLeaveFile(certFile, "med")
    }
  } catch (uploadError) {
    await supabase.from("hr_leaves").delete().eq("id", leave.id)
    const msg = uploadError instanceof Error ? uploadError.message : "upload failed"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (attachmentPath || medicalPath) {
    await supabase
      .from("hr_leaves")
      .update({
        attachment_url: attachmentPath,
        medical_certificate_url: medicalPath,
      })
      .eq("id", leave.id)
  }

  const leaveType = type as LeaveType

  try {
    if (employee.line_user_id) {
      await pushToLineUser(employee.line_user_id, [
        leaveSubmitConfirmFlex({
          employeeName: employee.name,
          type: leaveType,
          startDate,
          endDate,
          balanceRemaining: balance.remaining,
          locale: employee.preferred_locale,
        }),
      ])
    }

    await notifyHr([
      leaveSubmitHrNotifyFlex({
        leaveId: leave.id,
        employeeName: employee.name,
        department: employee.department,
        type: leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        locale: employee.preferred_locale,
      }),
    ])
  } catch (lineError) {
    console.error("leave request LINE notify failed:", lineError)
  }

  return NextResponse.json({
    id: leave.id,
    status: "pending",
    days,
    attachment_url: attachmentPath,
    balance,
  })
}
