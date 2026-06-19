import { NextResponse, type NextRequest } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import {
  approveEmployeeRegistration,
  rejectEmployeeRegistration,
} from "@/lib/registration/approve"

type DecideBody = {
  action?: "approve" | "reject"
  note?: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  let body: DecideBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  }

  if (body.action === "reject") {
    const note = body.note?.trim() ?? ""
    if (note.length < 3) {
      return NextResponse.json(
        { error: "ต้องระบุเหตุผลการปฏิเสธอย่างน้อย 3 ตัวอักษร" },
        { status: 400 }
      )
    }
    const result = await rejectEmployeeRegistration(id, note, caller.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true })
  }

  const result = await approveEmployeeRegistration(id, caller.id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
