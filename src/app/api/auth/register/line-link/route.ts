import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { linkLineEmployeeById } from "@/lib/auth/link-line-employee"
import { verifyIdToken } from "@/lib/auth/line-login"
import { mintLineUserSession } from "@/lib/auth/line-session"
import { isPortalLineId } from "@/lib/auth/line-user-id"
import {
  LINE_REGISTER_COOKIE,
  LINE_REGISTER_COOKIE_OPTS,
} from "@/lib/auth/register-cookie"
import { createClient } from "@/lib/supabase/server"

type Body = {
  id_token?: string
}

/** LIFF on /register: verify token, set cookie, auto-link portal session if present. */
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
    console.error("register line-link id_token verify failed", error)
    return NextResponse.json({ error: "invalid token" }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true, lineUserId, linked: false })
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
          console.error("register line-link session remint failed", error)
        }
        return NextResponse.json({
          ok: true,
          lineUserId,
          linked: true,
          employeeName: result.employeeName,
        })
      }
    }
  }

  return response
}
