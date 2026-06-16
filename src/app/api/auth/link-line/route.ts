import { NextResponse, type NextRequest } from "next/server"

import { linkLineEmployeeByCode, linkLineEmployeeById } from "@/lib/auth/link-line-employee"
import { verifyIdToken } from "@/lib/auth/line-login"
import { mintLineUserSession } from "@/lib/auth/line-session"
import { isPortalLineId } from "@/lib/auth/line-user-id"
import {
  LINE_REGISTER_COOKIE,
  LINE_REGISTER_COOKIE_OPTS,
} from "@/lib/auth/register-cookie"
import { getAdminClient } from "@/lib/auth/admin-client"
import { createClient } from "@/lib/supabase/server"

type Body = {
  id_token?: string
  employee_code?: string
}

export async function POST(request: NextRequest) {
  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const idToken = body.id_token?.trim()
  if (!idToken) {
    return NextResponse.json({ error: "missing id_token" }, { status: 400 })
  }

  let lineUserId: string
  try {
    const payload = await verifyIdToken(idToken)
    lineUserId = payload.sub
  } catch (error) {
    console.error("link-line id_token verify failed", error)
    return NextResponse.json({ error: "invalid token" }, { status: 401 })
  }

  const employeeCode = body.employee_code?.trim()
  if (employeeCode) {
    const result = await linkLineEmployeeByCode(lineUserId, employeeCode)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const response = NextResponse.json({
      linked: !result.alreadyLinked,
      alreadyLinked: result.alreadyLinked,
      employeeId: result.employeeId,
      employeeName: result.employeeName,
    })
    response.cookies.set(LINE_REGISTER_COOKIE, lineUserId, LINE_REGISTER_COOKIE_OPTS)

    if (!result.alreadyLinked) {
      try {
        await mintLineUserSession(request, response, lineUserId)
      } catch (error) {
        console.error("link-line session mint failed", error)
      }
    }

    return response
  }

  const response = NextResponse.json({ linked: false, lineUserId })
  response.cookies.set(LINE_REGISTER_COOKIE, lineUserId, LINE_REGISTER_COOKIE_OPTS)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const sessionLineId =
    typeof user?.app_metadata?.line_user_id === "string"
      ? user.app_metadata.line_user_id
      : null

  if (sessionLineId && isPortalLineId(sessionLineId)) {
    const admin = getAdminClient()
    const { data: employee } = await admin
      .from("hr_employees")
      .select("id, name, line_user_id")
      .eq("line_user_id", sessionLineId)
      .maybeSingle()

    if (employee) {
      const result = await linkLineEmployeeById(lineUserId, employee.id, employee)
      if (result.ok && !result.alreadyLinked) {
        try {
          await mintLineUserSession(request, response, lineUserId)
        } catch (error) {
          console.error("link-line session remint failed", error)
        }
        return NextResponse.json({
          linked: true,
          employeeId: result.employeeId,
          employeeName: result.employeeName,
          lineUserId,
        })
      }
    }
  }

  return response
}
