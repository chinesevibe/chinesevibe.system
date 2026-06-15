import { NextResponse, type NextRequest } from "next/server"

import { HEAD_OFFICE_BRANCH_CODE } from "@/lib/branches/constants"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

async function resolveDefaultBranchId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const { data } = await supabase
    .from("hr_branches")
    .select("id")
    .eq("code", HEAD_OFFICE_BRANCH_CODE)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}

export async function POST(request: NextRequest) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: { name?: string; branch_id?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (name.length < 2) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 })
  }

  const supabase = await createClient()

  let branchId = body.branch_id ?? null
  if (branchId) {
    const { data: branch } = await supabase
      .from("hr_branches")
      .select("id")
      .eq("id", branchId)
      .maybeSingle()
    if (!branch) {
      return NextResponse.json({ error: "branch not found" }, { status: 400 })
    }
  } else {
    branchId = await resolveDefaultBranchId(supabase)
  }

  const { data, error } = await supabase
    .from("hr_departments")
    .insert({ name, branch_id: branchId })
    .select("id, name")
    .single()

  if (error) {
    const msg =
      error.code === "23505"
        ? "ชื่อแผนกนี้มีในสาขานี้แล้ว"
        : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json(data)
}
