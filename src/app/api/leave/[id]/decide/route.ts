import { NextResponse, type NextRequest } from "next/server"

import { decideLeave } from "@/lib/approval/leave-decide"
import {
  getCurrentEmployeeWithBranch,
  canApproveHrRequests,
} from "@/lib/auth/branch"

type DecideBody = {
  action?: "approve" | "reject"
  note?: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployeeWithBranch()
  if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

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

  if (!canApproveHrRequests(caller.role)) {
    return NextResponse.json(
      { error: "เฉพาะ HR Officer เท่านั้นที่อนุมัติลาได้" },
      { status: 403 }
    )
  }

  const result = await decideLeave({
    leaveId: id,
    action: body.action,
    approverId: caller.id,
    note: body.note,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ id: result.id, status: result.status })
}
