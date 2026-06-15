import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { getCurrentEmployee } from "@/lib/auth/session"
import { syncLocaleFromLineApp } from "@/lib/i18n/employee-locale"
import { LOCALE_COOKIE } from "@/lib/i18n/types"

export async function POST(request: Request) {
  const employee = await getCurrentEmployee()
  if (!employee) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: { language?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const language = typeof body.language === "string" ? body.language.trim() : ""
  if (!language) {
    return NextResponse.json({ error: "missing language" }, { status: 400 })
  }

  try {
    const result = await syncLocaleFromLineApp({
      employeeId: employee.id,
      lineLanguage: language,
    })

    if (result.updated) {
      const cookieStore = await cookies()
      cookieStore.set(LOCALE_COOKIE, result.locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    }

    return NextResponse.json({
      ok: true,
      locale: result.locale,
      source: result.source,
      updated: result.updated,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "sync failed" },
      { status: 500 }
    )
  }
}
