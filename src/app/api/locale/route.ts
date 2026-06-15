import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { getCurrentEmployee } from "@/lib/auth/session"
import { setManualLocale } from "@/lib/i18n/employee-locale"
import { isAppLocale, LOCALE_COOKIE } from "@/lib/i18n/types"

/** Set locale cookie for guest auth pages; persists to employee when logged in. */
export async function POST(request: Request) {
  let body: { locale?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (!isAppLocale(body.locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 })
  }

  const employee = await getCurrentEmployee()
  if (employee) {
    try {
      await setManualLocale({ employeeId: employee.id, locale: body.locale })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "update failed" },
        { status: 500 }
      )
    }
  }

  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE, body.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  return NextResponse.json({
    ok: true,
    locale: body.locale,
    source: employee ? "manual" : "cookie",
  })
}
