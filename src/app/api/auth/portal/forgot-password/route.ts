import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { clearPortalPasswordHash } from "@/lib/auth/portal-password-reset"
import {
  getPortalPasswordRequirements,
  lookupPortalLoginEmployee,
} from "@/lib/auth/portal-login-lookup"

type ForgotBody = {
  employee_code?: string
  branch_id?: string
}

export async function POST(request: Request) {
  let body: ForgotBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const employeeCode = body.employee_code?.trim() ?? ""
  const branchId = body.branch_id?.trim() ?? ""

  if (!employeeCode) {
    return NextResponse.json({ error: "กรุณากรอกรหัสพนักงาน" }, { status: 400 })
  }
  if (!branchId) {
    return NextResponse.json({ error: "กรุณาเลือกสาขา" }, { status: 400 })
  }

  let employee
  try {
    employee = await lookupPortalLoginEmployee(employeeCode, branchId)
  } catch (error) {
    console.error("forgot password lookup failed", error)
    return NextResponse.json({ error: "ดำเนินการไม่สำเร็จ" }, { status: 500 })
  }

  if (!employee) {
    return NextResponse.json(
      { error: "รหัสพนักงานหรือสาขาไม่ถูกต้อง" },
      { status: 401 }
    )
  }

  if (employee.status !== "active") {
    return NextResponse.json(
      { error: "บัญชียังไม่พร้อมใช้งาน — ติดต่อ HR" },
      { status: 403 }
    )
  }

  const { requiresPassword } = getPortalPasswordRequirements(employee)
  if (!requiresPassword) {
    return NextResponse.json(
      { error: "บัญชีนี้ไม่ใช้รหัสผ่าน Portal" },
      { status: 400 }
    )
  }

  const admin = getAdminClient()
  const result = await clearPortalPasswordHash(admin, employee.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    message:
      "รีเซ็ตรหัสผ่านแล้ว — เข้าสู่ระบบอีกครั้งเพื่อตั้งรหัสผ่านใหม่",
  })
}
