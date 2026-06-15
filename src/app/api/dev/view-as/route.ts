import { NextResponse } from "next/server"

import {
  DEV_VIEW_COOKIE,
  parseDevViewAs,
  type DevViewAs,
} from "@/lib/auth/dev-view"
import { isDev } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export async function POST(request: Request) {
  const caller = await getCurrentEmployee()
  if (!caller || !isDev(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: { view?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const view: DevViewAs = parseDevViewAs(body.view)
  const response = NextResponse.json({ ok: true, view })
  response.cookies.set(DEV_VIEW_COOKIE, view, {
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
    httpOnly: true,
  })
  return response
}
