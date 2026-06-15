import { NextResponse, type NextRequest } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: { name?: string; department_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const departmentId =
    typeof body.department_id === "string" ? body.department_id.trim() : ""

  if (name.length < 2) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 })
  }
  if (!departmentId) {
    return NextResponse.json({ error: "department required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: department, error: deptError } = await supabase
    .from("hr_departments")
    .select("id, branch_id")
    .eq("id", departmentId)
    .maybeSingle()

  if (deptError) {
    return NextResponse.json({ error: deptError.message }, { status: 500 })
  }
  if (!department) {
    return NextResponse.json({ error: "department not found" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("hr_positions")
    .insert({
      name,
      department_id: departmentId,
      branch_id: department.branch_id as string | null,
    })
    .select("id, name, department_id")
    .single()

  if (error) {
    const msg =
      error.code === "23505"
        ? "ตำแหน่งนี้มีในแผนกแล้ว"
        : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json(data)
}
