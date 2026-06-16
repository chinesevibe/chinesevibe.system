import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  getNotificationInbox,
  resolveNotificationScope,
} from "@/features/notifications/data"
import {
  DEV_VIEW_COOKIE,
  parseDevViewAs,
} from "@/lib/auth/dev-view"
import { canEmployeeAccessAdminPortal } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export async function GET() {
  const employee = await getCurrentEmployee()
  if (!employee || !canEmployeeAccessAdminPortal(employee)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const devView =
    employee.role === "dev"
      ? parseDevViewAs((await cookies()).get(DEV_VIEW_COOKIE)?.value)
      : null

  const scope = resolveNotificationScope(employee, devView)
  if (!scope) {
    return NextResponse.json({
      items: [],
      total: 0,
      approvalTotal: 0,
      complianceTotal: 0,
    })
  }

  const inbox = await getNotificationInbox(employee, scope)
  return NextResponse.json(inbox)
}
