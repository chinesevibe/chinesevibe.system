import { NextResponse } from "next/server"

import {
  getPortalPasswordRequirements,
  lookupPortalLoginEmployee,
} from "@/lib/auth/portal-login-lookup"

type LoginRequirementsBody = {
  employee_code?: string
  branch_id?: string
}

export async function POST(request: Request) {
  let body: LoginRequirementsBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const employeeCode = body.employee_code?.trim() ?? ""
  const branchId = body.branch_id?.trim() ?? ""

  if (!employeeCode || !branchId) {
    return NextResponse.json({
      requiresPassword: false,
      needsSetup: false,
    })
  }

  try {
    const employee = await lookupPortalLoginEmployee(employeeCode, branchId)
    if (!employee) {
      return NextResponse.json({
        requiresPassword: false,
        needsSetup: false,
      })
    }

    const { requiresPassword, needsSetup } =
      getPortalPasswordRequirements(employee)

    return NextResponse.json({ requiresPassword, needsSetup })
  } catch (error) {
    console.error("portal login requirements failed", error)
    return NextResponse.json(
      { error: "ตรวจสอบข้อมูลไม่สำเร็จ" },
      { status: 500 }
    )
  }
}
