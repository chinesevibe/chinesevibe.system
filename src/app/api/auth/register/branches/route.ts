import { NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"

/** Public org options for self-registration. */
export async function GET() {
  const admin = getAdminClient()
  const [branchRes, deptRes, posRes] = await Promise.all([
    admin.from("hr_branches").select("id, name, code").order("name"),
    admin.from("hr_departments").select("id, name, branch_id").order("name"),
    admin
      .from("hr_positions")
      .select("id, name, department_id, branch_id")
      .order("name"),
  ])

  if (branchRes.error) {
    return NextResponse.json({ error: branchRes.error.message }, { status: 500 })
  }
  if (deptRes.error) {
    return NextResponse.json({ error: deptRes.error.message }, { status: 500 })
  }
  if (posRes.error) {
    return NextResponse.json({ error: posRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    branches: branchRes.data ?? [],
    departments: deptRes.data ?? [],
    positions: posRes.data ?? [],
  })
}
