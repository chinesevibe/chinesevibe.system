import QRCode from "qrcode"
import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createCheckinToken } from "@/lib/checkin/qr-token"

// HR/admin only: returns a PNG QR encoding the day-bound check-in URL for
// one employee. Printed daily (token expires at ICT midnight).
export async function GET(request: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const employeeId = request.nextUrl.searchParams.get("emp_id")
  if (!employeeId) {
    return NextResponse.json({ error: "emp_id is required" }, { status: 400 })
  }

  const { data: employee } = await getAdminClient()
    .from("hr_employees")
    .select("id")
    .eq("id", employeeId)
    .eq("status", "active")
    .maybeSingle()

  if (!employee) {
    return NextResponse.json({ error: "employee not found" }, { status: 404 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_BASE_URL is not set" },
      { status: 500 }
    )
  }

  const token = createCheckinToken(employee.id)
  const url = `${baseUrl}/liff/checkin?token=${encodeURIComponent(token)}`
  const png = await QRCode.toBuffer(url, { width: 512, margin: 2 })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store",
    },
  })
}
