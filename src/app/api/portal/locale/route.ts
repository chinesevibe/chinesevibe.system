import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { getCurrentEmployee } from "@/lib/auth/session"
import { setManualLocale } from "@/lib/i18n/employee-locale"
import { isAppLocale, LOCALE_COOKIE } from "@/lib/i18n/types"

export async function POST(request: Request) {
  const employee = await getCurrentEmployee()
  if (!employee) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (!isAppLocale(body.locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 })
  }

  try {
    await setManualLocale({ employeeId: employee.id, locale: body.locale })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "update failed" },
      { status: 500 }
    )
  }

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, body.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  return NextResponse.json({ ok: true, locale: body.locale, source: "manual" })
}
