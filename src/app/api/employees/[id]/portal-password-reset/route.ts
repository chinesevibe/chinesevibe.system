import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import {
  clearPortalPasswordHash,
  getPortalPasswordStatus,
} from "@/lib/auth/portal-password-reset"
import { canEditEmployeeRecord } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canEditEmployeeRecord(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const admin = getAdminClient()
  const status = await getPortalPasswordStatus(admin, id)

  if (!status) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  return NextResponse.json(status)
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canEditEmployeeRecord(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const admin = getAdminClient()
  const result = await clearPortalPasswordHash(admin, id)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    message: "รีเซ็ตรหัสผ่าน Officer แล้ว — พนักงานตั้งรหัสใหม่เมื่อ login ครั้งถัดไป",
  })
}
