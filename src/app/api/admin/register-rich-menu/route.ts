import { NextResponse } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { registerRichMenu } from "@/lib/line/rich-menu"

export async function POST() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_BASE_URL is not set" }, { status: 500 })
  }

  const clockLiffUri = `${base}/liff/clock`

  try {
    const richMenuId = await registerRichMenu("public/rich-menu.png", clockLiffUri)
    return NextResponse.json({ ok: true, richMenuId, clockLiffUri })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
