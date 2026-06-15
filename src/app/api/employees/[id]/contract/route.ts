import { NextResponse, type NextRequest } from "next/server"

import { isAllowedEmployeeContract } from "@/lib/employees/contract"
import {
  deleteEmployeeContractFile,
  uploadEmployeeContract,
} from "@/lib/employees/upload-contract"
import {
  canEditEmployeeRecord,
  canManageHr,
  isCeo,
  type AppRole,
} from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

function canReadContract(callerRole: AppRole, callerId: string, targetId: string) {
  return (
    callerId === targetId ||
    canManageHr(callerRole) ||
    isCeo(callerRole)
  )
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  if (!canReadContract(caller.role as AppRole, caller.id, id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_employees")
    .select("contract_file_path, contract_file_name")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data?.contract_file_path) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { data: signed, error: signError } = await supabase.storage
    .from("hr-contracts")
    .createSignedUrl(data.contract_file_path as string, 60 * 60)

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: signError?.message ?? "sign failed" }, { status: 500 })
  }

  return NextResponse.redirect(signed.signedUrl)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canEditEmployeeRecord(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const form = await request.formData()
  const fileField = form.get("contract")
  const file = fileField instanceof File && fileField.size > 0 ? fileField : null

  if (!file || !isAllowedEmployeeContract(file)) {
    return NextResponse.json(
      { error: "ไฟล์ต้องเป็น PDF, JPEG หรือ PNG ไม่เกิน 5 MB" },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: existing, error: loadError } = await supabase
    .from("hr_employees")
    .select("id, contract_file_path")
    .eq("id", id)
    .maybeSingle()

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  let contractPath: string
  try {
    contractPath = await uploadEmployeeContract(supabase, id, file)
  } catch (uploadError) {
    const message =
      uploadError instanceof Error ? uploadError.message : "อัปโหลดไม่สำเร็จ"
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const uploadedAt = new Date().toISOString()
  const { error: updateError } = await supabase
    .from("hr_employees")
    .update({
      contract_file_path: contractPath,
      contract_file_name: file.name,
      contract_uploaded_at: uploadedAt,
    })
    .eq("id", id)

  if (updateError) {
    await deleteEmployeeContractFile(supabase, contractPath).catch(() => undefined)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (
    existing.contract_file_path &&
    existing.contract_file_path !== contractPath
  ) {
    await deleteEmployeeContractFile(
      supabase,
      existing.contract_file_path as string
    ).catch(() => undefined)
  }

  return NextResponse.json({
    contract_file_path: contractPath,
    contract_file_name: file.name,
    contract_uploaded_at: uploadedAt,
  })
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canEditEmployeeRecord(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  const supabase = await createClient()
  const { data: existing, error: loadError } = await supabase
    .from("hr_employees")
    .select("id, contract_file_path")
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
    .update({
      contract_file_path: null,
      contract_file_name: null,
      contract_uploaded_at: null,
    })
    .eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await deleteEmployeeContractFile(
    supabase,
    existing.contract_file_path as string | null
  ).catch(() => undefined)

  return NextResponse.json({ ok: true })
}
