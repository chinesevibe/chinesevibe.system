import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { requiresOfficerPortalPassword } from "@/lib/auth/department-access"
import {
  setOfficerPasswordVerifiedCookie,
} from "@/lib/auth/officer-password-session"
import {
  hashPortalPassword,
  validatePortalPassword,
  verifyPortalPassword,
} from "@/lib/auth/portal-password"
import { adminLoginPath } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { sanitizeReturnTo } from "@/lib/navigation/return-to"

type VerifyPasswordBody = {
  next?: string
  password?: string
  password_confirm?: string
}

async function loadOfficerPasswordHash(employeeId: string): Promise<string | null> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_employees")
    .select("portal_password_hash")
    .eq("id", employeeId)
    .maybeSingle()

  if (error) throw error
  return typeof data?.portal_password_hash === "string"
    ? data.portal_password_hash
    : null
}

export async function GET() {
  const employee = await getCurrentEmployee()
  if (!employee || !requiresOfficerPortalPassword(employee.department)) {
    return NextResponse.json({ requiresPassword: false, needsSetup: false })
  }

  try {
    const hash = await loadOfficerPasswordHash(employee.id)
    return NextResponse.json({
      requiresPassword: true,
      needsSetup: !hash,
    })
  } catch (error) {
    console.error("officer password status failed", error)
    return NextResponse.json({ error: "ตรวจสอบข้อมูลไม่สำเร็จ" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const employee = await getCurrentEmployee()
  if (!employee) {
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 })
  }
  if (!requiresOfficerPortalPassword(employee.department)) {
    return NextResponse.json({ error: "ไม่ต้องใช้รหัสผ่าน" }, { status: 400 })
  }

  let body: VerifyPasswordBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const password = body.password ?? ""
  const passwordConfirm = body.password_confirm ?? ""
  const next = sanitizeReturnTo(body.next)
  const admin = getAdminClient()

  try {
    const storedHash = await loadOfficerPasswordHash(employee.id)
    const needsSetup = !storedHash

    if (needsSetup) {
      if (!password || !passwordConfirm) {
        return NextResponse.json(
          { error: "กรุณาตั้งรหัสผ่านและยืนยันรหัสผ่าน" },
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

      const { error: updateError } = await admin
        .from("hr_employees")
        .update({ portal_password_hash: hashPortalPassword(password) })
        .eq("id", employee.id)

      if (updateError) {
        console.error("officer password setup failed", updateError)
        return NextResponse.json({ error: "ตั้งรหัสผ่านไม่สำเร็จ" }, { status: 500 })
      }
    } else {
      if (!password) {
        return NextResponse.json(
          { error: "กรุณากรอกรหัสผ่าน" },
          { status: 400 }
        )
      }
      if (!verifyPortalPassword(password, storedHash)) {
        return NextResponse.json(
          { error: "รหัสผ่านไม่ถูกต้อง" },
          { status: 401 }
        )
      }
    }

    const redirect =
      next ??
      adminLoginPath(
        employee.role,
        employee.status,
        employee.department,
        employee.position
      )
    const response = NextResponse.json({ redirect, passwordSetupComplete: needsSetup })
    setOfficerPasswordVerifiedCookie(response, employee.id)
    return response
  } catch (error) {
    console.error("officer password verify failed", error)
    return NextResponse.json({ error: "เข้าสู่ระบบไม่สำเร็จ" }, { status: 500 })
  }
}
