import { NextResponse, type NextRequest } from "next/server"

import { applyBranchManagerAssignment } from "@/lib/branches/assign-manager"
import { canManageHr, isCeo, isDev } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const caller = await getCurrentEmployee()
  if (!caller || (!canManageHr(caller.role) && !isCeo(caller.role) && !isDev(caller.role))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_branches")
    .select("id, name, code, address, manager_employee_id")
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ branches: data ?? [] })
}

export async function POST(request: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: { name?: string; code?: string; managerEmployeeId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("hr_branches")
    .insert({
      name: body.name.trim(),
      code: body.code?.trim() || null,
      manager_employee_id: null,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.managerEmployeeId) {
    const assignment = await applyBranchManagerAssignment(
      supabase,
      data.id as string,
      body.managerEmployeeId
    )
    if (!assignment.ok) {
      await supabase.from("hr_branches").delete().eq("id", data.id)
      return NextResponse.json(
        { error: assignment.error },
        { status: assignment.status }
      )
    }

    const { error: managerLinkError } = await supabase
      .from("hr_branches")
      .update({ manager_employee_id: body.managerEmployeeId })
      .eq("id", data.id)

    if (managerLinkError) {
      return NextResponse.json({ error: managerLinkError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ id: data.id })
}
