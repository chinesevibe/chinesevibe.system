import { NextResponse, type NextRequest } from "next/server"

import { defaultRoleForDepartment } from "@/lib/auth/department-role-defaults"
import { getAdminClient } from "@/lib/auth/admin-client"
import { PENDING_REGISTRATION_PATH } from "@/lib/auth/employee-access"
import { mintLineUserSession } from "@/lib/auth/line-session"
import {
  LINE_REGISTER_COOKIE,
  LINE_REGISTER_COOKIE_OPTS,
} from "@/lib/auth/register-cookie"
import { adminLoginPath } from "@/lib/auth/roles"
import type { Employee } from "@/lib/auth/session"
import { notifyRegistrationPending } from "@/lib/line/notify-registration"
import { defaultPayTypeForBranchCode } from "@/lib/payroll/pay-type"

type RegisterBody = {
  first_name?: string
  last_name?: string
  employee_code?: string
  branch_id?: string
  department_id?: string
  department?: string
  position_id?: string
  position?: string
}

type EmployeeRow = {
  id: string
  line_user_id: string | null
  role: Employee["role"]
  status: Employee["status"]
  department: string | null
  position: string | null
  leave_blacklisted: boolean | null
}

function isRealLineId(id: string | null | undefined): id is string {
  return typeof id === "string" && id.startsWith("U")
}

function buildFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim()
}

async function validateOrganizationFields(
  admin: ReturnType<typeof getAdminClient>,
  input: {
    departmentId?: string
    departmentName?: string
    positionId?: string
    positionName?: string
  }
): Promise<{ department: string; position: string; error: string | null }> {
  let dept: { id: string; name: string } | null = null

  if (input.departmentId) {
    const { data, error } = await admin
      .from("hr_departments")
      .select("id, name")
      .eq("id", input.departmentId)
      .maybeSingle()
    if (error || !data) {
      return { department: "", position: "", error: "แผนกไม่ถูกต้อง — ติดต่อ HR" }
    }
    dept = data
  } else if (input.departmentName) {
    const { data, error } = await admin
      .from("hr_departments")
      .select("id, name")
      .eq("name", input.departmentName)
      .maybeSingle()
    if (error || !data) {
      return { department: "", position: "", error: "แผนกไม่ถูกต้อง — ติดต่อ HR" }
    }
    dept = data
  } else {
    return { department: "", position: "", error: "กรุณาเลือกแผนก" }
  }

  let pos: { id: string; name: string } | null = null

  if (input.positionId) {
    const { data, error } = await admin
      .from("hr_positions")
      .select("id, name, department_id")
      .eq("id", input.positionId)
      .maybeSingle()
    if (error || !data || data.department_id !== dept.id) {
      return { department: "", position: "", error: "ตำแหน่งไม่ถูกต้อง — ติดต่อ HR" }
    }
    pos = data
  } else if (input.positionName) {
    const { data, error } = await admin
      .from("hr_positions")
      .select("id, name")
      .eq("name", input.positionName)
      .eq("department_id", dept.id)
      .maybeSingle()
    if (error || !data) {
      return { department: "", position: "", error: "ตำแหน่งไม่ถูกต้อง — ติดต่อ HR" }
    }
    pos = data
  } else {
    return { department: "", position: "", error: "กรุณาเลือกตำแหน่ง" }
  }

  return { department: dept.name, position: pos.name, error: null }
}

async function resolveEmployeeForRegistration(
  admin: ReturnType<typeof getAdminClient>,
  input: {
    name: string
    employeeCode: string
    branchId: string
    departmentId?: string
    departmentName?: string
    positionId?: string
    positionName?: string
  }
): Promise<{ employee: EmployeeRow | null; error: string | null }> {
  const { data: byCode, error: codeError } = await admin
    .from("hr_employees")
    .select(
      "id, line_user_id, role, status, department, position, leave_blacklisted, branch_id"
    )
    .ilike("employee_code", input.employeeCode)
    .maybeSingle()

  if (codeError) {
    console.error("register employee code lookup failed", codeError)
    return { employee: null, error: "ลงทะเบียนไม่สำเร็จ" }
  }

  if (byCode) {
    if ((byCode.branch_id as string | null) !== input.branchId) {
      return {
        employee: null,
        error: "รหัสพนักงานนี้อยู่ในสาขาอื่น — ตรวจสอบสาขาที่เลือก",
      }
    }
    return { employee: byCode as EmployeeRow, error: null }
  }

  const org = await validateOrganizationFields(admin, {
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    positionId: input.positionId,
    positionName: input.positionName,
  })
  if (org.error) {
    return { employee: null, error: org.error }
  }

  const { data: branch } = await admin
    .from("hr_branches")
    .select("code")
    .eq("id", input.branchId)
    .maybeSingle()

  const role = defaultRoleForDepartment(org.department, org.position)
  const payType = defaultPayTypeForBranchCode(
    (branch?.code as string | null) ?? null
  )

  const { data: created, error: insertError } = await admin
    .from("hr_employees")
    .insert({
      name: input.name,
      employee_code: input.employeeCode,
      branch_id: input.branchId,
      department: org.department,
      position: org.position,
      role,
      pay_type: payType,
      status: "inactive",
    })
    .select(
      "id, line_user_id, role, status, department, position, leave_blacklisted"
    )
    .single()

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        employee: null,
        error: "รหัสพนักงานนี้มีในระบบแล้ว — ติดต่อ HR",
      }
    }
    console.error("register create employee failed", insertError)
    return { employee: null, error: "ลงทะเบียนไม่สำเร็จ" }
  }

  return { employee: created as EmployeeRow, error: null }
}

export async function POST(request: NextRequest) {
  const cookieLineId = request.cookies.get(LINE_REGISTER_COOKIE)?.value
  const hasRealLineCookie = isRealLineId(cookieLineId)

  let body: RegisterBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const firstName = body.first_name?.trim() ?? ""
  const lastName = body.last_name?.trim() ?? ""
  const name = buildFullName(firstName, lastName)
  const employeeCode = body.employee_code?.trim() ?? ""
  const branchId = body.branch_id?.trim() ?? ""
  const departmentId = body.department_id?.trim() ?? ""
  const departmentName = body.department?.trim() ?? ""
  const positionId = body.position_id?.trim() ?? ""
  const positionName = body.position?.trim() ?? ""

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อและนามสกุล" },
      { status: 400 }
    )
  }
  if (!employeeCode) {
    return NextResponse.json(
      { error: "กรุณากรอกรหัสพนักงาน" },
      { status: 400 }
    )
  }
  if (!branchId) {
    return NextResponse.json({ error: "กรุณาเลือกสาขา" }, { status: 400 })
  }
  if (!departmentId && !departmentName) {
    return NextResponse.json({ error: "กรุณาเลือกแผนก" }, { status: 400 })
  }
  if (!positionId && !positionName) {
    return NextResponse.json({ error: "กรุณาเลือกตำแหน่ง" }, { status: 400 })
  }

  const admin = getAdminClient()

  const orgResolved = await validateOrganizationFields(admin, {
    departmentId: departmentId || undefined,
    departmentName: departmentName || undefined,
    positionId: positionId || undefined,
    positionName: positionName || undefined,
  })
  if (orgResolved.error) {
    return NextResponse.json({ error: orgResolved.error }, { status: 400 })
  }
  const department = orgResolved.department
  const position = orgResolved.position

  let existingLineEmployeeId: string | undefined
  if (hasRealLineCookie) {
    const { data: lineEmployee, error: lineLookupError } = await admin
      .from("hr_employees")
      .select("id")
      .eq("line_user_id", cookieLineId)
      .maybeSingle()

    if (lineLookupError) {
      console.error("register line lookup failed", lineLookupError)
      return NextResponse.json(
        { error: "ลงทะเบียนไม่สำเร็จ" },
        { status: 500 }
      )
    }

    existingLineEmployeeId = lineEmployee?.id as string | undefined
  }

  const resolved = await resolveEmployeeForRegistration(admin, {
    name,
    employeeCode,
    branchId,
    departmentId: departmentId || undefined,
    departmentName: department,
    positionId: positionId || undefined,
    positionName: position,
  })

  if (resolved.error || !resolved.employee) {
    return NextResponse.json(
      { error: resolved.error ?? "ลงทะเบียนไม่สำเร็จ" },
      { status: 400 }
    )
  }

  const employee = resolved.employee

  if (employee.leave_blacklisted) {
    return NextResponse.json(
      { error: "บัญชีอยู่ใน Leave Blacklist — ติดต่อ HR" },
      { status: 403 }
    )
  }

  if (
    hasRealLineCookie &&
    existingLineEmployeeId &&
    existingLineEmployeeId !== employee.id
  ) {
    return NextResponse.json(
      { error: "บัญชี LINE นี้ผูกกับพนักงานคนอื่นแล้ว" },
      { status: 409 }
    )
  }

  const existingLineId = employee.line_user_id
  const employeeHasRealLine = isRealLineId(existingLineId)

  if (
    employeeHasRealLine &&
    hasRealLineCookie &&
    existingLineId !== cookieLineId
  ) {
    return NextResponse.json(
      { error: "รหัสพนักงานนี้ถูกผูกกับบัญชีอื่นแล้ว" },
      { status: 409 }
    )
  }

  if (employeeHasRealLine && !hasRealLineCookie) {
    return NextResponse.json(
      {
        error:
          "รหัสพนักงานนี้ถูกผูกกับ LINE แล้ว — เข้าสู่ระบบด้วย LINE หรือรหัสพนักงาน",
      },
      { status: 409 }
    )
  }

  const role = employee.role
  const status = employee.status
  const employeeDepartment =
    typeof employee.department === "string" ? employee.department : null
  const employeePosition =
    typeof employee.position === "string" ? employee.position : null

  const hadRealLineBefore = employeeHasRealLine
  let sessionLineUserId = existingLineId

  if (hasRealLineCookie && existingLineId !== cookieLineId) {
    const { error: updateError } = await admin
      .from("hr_employees")
      .update({
        line_user_id: cookieLineId,
        name,
        department,
        position,
      })
      .eq("id", employee.id)

    if (updateError) {
      console.error("register line link failed", updateError)
      return NextResponse.json({ error: "ลงทะเบียนไม่สำเร็จ" }, { status: 500 })
    }
    sessionLineUserId = cookieLineId
  } else if (!existingLineId) {
    sessionLineUserId = `portal_${employee.id}`
    const { error: updateError } = await admin
      .from("hr_employees")
      .update({
        line_user_id: sessionLineUserId,
        name,
        department,
        position,
      })
      .eq("id", employee.id)

    if (updateError) {
      console.error("register portal id assign failed", updateError)
      return NextResponse.json({ error: "ลงทะเบียนไม่สำเร็จ" }, { status: 500 })
    }
  } else if (status === "inactive") {
    const { error: updateError } = await admin
      .from("hr_employees")
      .update({ name, department, position })
      .eq("id", employee.id)

    if (updateError) {
      console.error("register profile update failed", updateError)
      return NextResponse.json({ error: "ลงทะเบียนไม่สำเร็จ" }, { status: 500 })
    }
  }

  const redirect =
    status === "active"
      ? adminLoginPath(role, status, employeeDepartment, employeePosition)
      : PENDING_REGISTRATION_PATH

  const response = NextResponse.json({ redirect })

  try {
    await mintLineUserSession(request, response, sessionLineUserId!)
  } catch (error) {
    console.error("register session mint failed", error)
    return NextResponse.json(
      { error: "ลงทะเบียนไม่สำเร็จ — กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    )
  }

  if (hasRealLineCookie) {
    response.cookies.set(LINE_REGISTER_COOKIE, "", {
      ...LINE_REGISTER_COOKIE_OPTS,
      maxAge: 0,
    })
  }

  const shouldNotify =
    status === "inactive" && hasRealLineCookie && !hadRealLineBefore

  if (shouldNotify) {
    void notifyRegistrationPending(employee.id).catch((err) => {
      console.error("register notify HR failed:", err)
    })
  }

  return response
}
