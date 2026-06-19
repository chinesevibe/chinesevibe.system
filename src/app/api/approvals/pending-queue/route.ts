import { NextResponse } from "next/server"

import { fetchPendingQueuePayload } from "@/lib/approvals/pending-queue-data"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export async function GET() {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  try {
    const payload = await fetchPendingQueuePayload()
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "load failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
