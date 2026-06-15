import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { mintLineUserSession } from "@/lib/auth/line-session"
import { adminLoginPath } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"

type PortalLoginBody = {
  employee_code?: string
  branch_id?: string
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

  if (!employeeCode) {
    return NextResponse.json(
      { error: "กรุณากรอกรหัสพนักงาน" },
      { status: 400 }
    )
  }
  if (!branchId) {
    return NextResponse.json({ error: "กรุณาเลือกสาขา" }, { status: 400 })
  }

  const admin = getAdminClient()

  const { data: employee, error: lookupError } = await admin
    .from("hr_employees")
    .select("id, line_user_id, role, status, department, position")
    .eq("branch_id", branchId)
    .ilike("employee_code", employeeCode)
    .maybeSingle()

  if (lookupError) {
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

  let lineUserId = employee.line_user_id as string | null
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
  const department =
    typeof employee.department === "string" ? employee.department : null
  const position =
    typeof employee.position === "string" ? employee.position : null
  const redirect = adminLoginPath(role, status, department, position)

  const response = NextResponse.json({ redirect })

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
