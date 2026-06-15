import { NextResponse, type NextRequest } from "next/server"

import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const supabase = await createClient()

  const { data: position, error: posError } = await supabase
    .from("hr_positions")
    .select("id, name, hr_departments(name)")
    .eq("id", id)
    .maybeSingle()

  if (posError) {
    return NextResponse.json({ error: posError.message }, { status: 500 })
  }
  if (!position) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const deptJoin = position.hr_departments as
    | { name: string }
    | Array<{ name: string }>
    | null
  const departmentName = Array.isArray(deptJoin)
    ? deptJoin[0]?.name
    : deptJoin?.name

  if (departmentName) {
    const { count, error: countError } = await supabase
      .from("hr_employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("department", departmentName)
      .eq("position", position.name)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบได้ — มีพนักงาน ${count} คนในตำแหน่งนี้` },
        { status: 400 }
      )
    }
  }

  const { error } = await supabase.from("hr_positions").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
