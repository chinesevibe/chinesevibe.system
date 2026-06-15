import { NextResponse, type NextRequest } from "next/server"

import { isAllowedEmployeeAvatar } from "@/lib/employees/avatar"
import {
  deleteEmployeeAvatarFile,
  uploadEmployeeAvatar,
} from "@/lib/employees/upload-avatar"
import { canEditEmployeeRecord, type AppRole } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

function canManageAvatar(callerId: string, callerRole: AppRole, targetId: string) {
  return callerId === targetId || canEditEmployeeRecord(callerRole)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  if (!canManageAvatar(caller.id, caller.role, id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const form = await request.formData()
  const avatarField = form.get("avatar")
  const file = avatarField instanceof File && avatarField.size > 0 ? avatarField : null
  if (!file || !isAllowedEmployeeAvatar(file)) {
    return NextResponse.json(
      { error: "รูปโปรไฟล์ต้องเป็น JPEG, PNG หรือ WebP ไม่เกิน 3 MB" },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: existing, error: loadError } = await supabase
    .from("hr_employees")
    .select("id, avatar_path")
    .eq("id", id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  let avatarPath: string
  try {
    avatarPath = await uploadEmployeeAvatar(supabase, id, file)
  } catch (uploadError) {
    const message =
      uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปไม่สำเร็จ"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from("hr_employees")
    .update({ avatar_path: avatarPath })
    .eq("id", id)

  if (updateError) {
    await deleteEmployeeAvatarFile(supabase, avatarPath).catch(() => undefined)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (existing.avatar_path && existing.avatar_path !== avatarPath) {
    await deleteEmployeeAvatarFile(supabase, existing.avatar_path as string).catch(
      () => undefined
    )
  }

  return NextResponse.json({ avatarPath })
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  if (!canManageAvatar(caller.id, caller.role, id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: existing, error: loadError } = await supabase
    .from("hr_employees")
    .select("id, avatar_path")
    .eq("id", id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from("hr_employees")
    .update({ avatar_path: null })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await deleteEmployeeAvatarFile(supabase, existing.avatar_path as string | null).catch(
    () => undefined
  )

  return NextResponse.json({ ok: true })
}
