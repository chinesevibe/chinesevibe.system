import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { mintLineUserSession } from "@/lib/auth/line-session"
import {
  getPortalPasswordRequirements,
  lookupPortalLoginEmployee,
} from "@/lib/auth/portal-login-lookup"
import {
  hashPortalPassword,
  validatePortalPassword,
  verifyPortalPassword,
} from "@/lib/auth/portal-password"
import { adminLoginPath } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"

type PortalLoginBody = {
  employee_code?: string
  branch_id?: string
  password?: string
  password_confirm?: string
}

export async function POST(request: NextRequest) {
  let body: PortalLoginBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const employeeCode = body.employee_code?.trim() ?? ""
  const branchId = body.branch_id?.trim() ?? ""
  const password = body.password ?? ""
  const passwordConfirm = body.password_confirm ?? ""

  if (!employeeCode) {
    return NextResponse.json(
      { error: "กรุณากรอกรหัสพนักงาน" },
      { status: 400 }
    )
  }
  if (!branchId) {
    return NextResponse.json({ error: "กรุณาเลือกสาขา" }, { status: 400 })
  }

  let employee
  try {
    employee = await lookupPortalLoginEmployee(employeeCode, branchId)
  } catch (lookupError) {
    console.error("portal login lookup failed", lookupError)
    return NextResponse.json(
      { error: "เข้าสู่ระบบไม่สำเร็จ" },
      { status: 500 }
    )
  }

  if (!employee) {
    return NextResponse.json(
      { error: "รหัสพนักงานหรือสาขาไม่ถูกต้อง" },
      { status: 401 }
    )
  }

  const { requiresPassword, needsSetup } =
    getPortalPasswordRequirements(employee)

  const admin = getAdminClient()

  if (requiresPassword) {
    if (needsSetup) {
      if (!password || !passwordConfirm) {
        return NextResponse.json(
          {
            error: "กรุณาตั้งรหัสผ่านและยืนยันรหัสผ่าน",
            needsSetup: true,
          },
          { status: 400 }
        )
      }
      if (password !== passwordConfirm) {
        return NextResponse.json(
          { error: "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน" },
          { status: 400 }
        )
      }
      const validationError = validatePortalPassword(password)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      const portalPasswordHash = hashPortalPassword(password)
      const { error: passwordError } = await admin
        .from("hr_employees")
        .update({ portal_password_hash: portalPasswordHash })
        .eq("id", employee.id)

      if (passwordError) {
        console.error("portal password setup failed", passwordError)
        return NextResponse.json(
          { error: "ตั้งรหัสผ่านไม่สำเร็จ" },
          { status: 500 }
        )
      }
    } else {
      if (!password) {
        return NextResponse.json(
          { error: "กรุณากรอกรหัสผ่าน" },
          { status: 400 }
        )
      }
      if (!verifyPortalPassword(password, employee.portal_password_hash)) {
        return NextResponse.json(
          { error: "รหัสผ่านไม่ถูกต้อง" },
          { status: 401 }
        )
      }
    }
  }

  let lineUserId = employee.line_user_id
  if (!lineUserId) {
    lineUserId = `portal_${employee.id}`
    const { error: updateError } = await admin
      .from("hr_employees")
      .update({ line_user_id: lineUserId })
      .eq("id", employee.id)

    if (updateError) {
      console.error("portal login line_user_id assign failed", updateError)
      return NextResponse.json(
        { error: "เข้าสู่ระบบไม่สำเร็จ" },
        { status: 500 }
      )
    }
  }

  const role = employee.role as Employee["role"]
  const status = employee.status as Employee["status"]
  const redirect = adminLoginPath(
    role,
    status,
    employee.department,
    employee.position
  )

  const response = NextResponse.json({
    redirect,
    passwordSetupComplete: needsSetup,
  })

  try {
    await mintLineUserSession(request, response, lineUserId)
  } catch (error) {
    console.error("portal login session mint failed", error)
    return NextResponse.json(
      { error: "เข้าสู่ระบบไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    )
  }

  return response
}
