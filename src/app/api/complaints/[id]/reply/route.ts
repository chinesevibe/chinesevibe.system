import { NextResponse, type NextRequest } from "next/server"

import { replyComplaint } from "@/lib/approval/complaint-reply"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

type ReplyBody = {
  message?: string
  close?: boolean
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
  let body: ReplyBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const result = await replyComplaint({
    complaintId: id,
    approverId: caller.id,
    approverName: caller.name,
    message: body.message,
    close: body.close === true,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    id: result.id,
    status: result.status,
    lineNotified: result.lineNotified,
    lineNotifyReason: result.lineNotifyReason,
    replyCount: result.replyCount,
  })
}
