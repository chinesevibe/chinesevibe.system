import { NextResponse } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { publicBaseUrl } from "@/lib/i18n/liff-url"
import { buildClockLiffUri, registerRichMenu } from "@/lib/line/rich-menu"

export async function POST() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const base = publicBaseUrl()
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_BASE_URL is not set" }, { status: 500 })
  }

  const clockLiffUri = buildClockLiffUri(base, process.env.NEXT_PUBLIC_LINE_LIFF_ID)
  const imageUrl = `${base}/rich-menu.png`

  try {
    const richMenuId = await registerRichMenu(imageUrl, clockLiffUri)
    return NextResponse.json({ ok: true, richMenuId, clockLiffUri, imageUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
