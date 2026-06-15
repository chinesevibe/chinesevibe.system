import { NextResponse, type NextRequest } from "next/server"

import { applyBranchManagerAssignment } from "@/lib/branches/assign-manager"
import {
  canChangeBranchCode,
  mapBranchCodeConflict,
  normalizeBranchCode,
} from "@/lib/branches/branch-code"
import { isHeadOfficeBranchCode } from "@/lib/branches/head-office"
import { canManageHr } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { GEOFENCE_MAX_RADIUS_M } from "@/lib/geofence/validate"
import { createClient } from "@/lib/supabase/server"

type PatchBody = {
  name?: string
  code?: string | null
  address?: string | null
  managerEmployeeId?: string | null
  latitude?: number | null
  longitude?: number | null
  geofence_enabled?: boolean
  geofence_radius_m?: number
}

function parseCoord(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("invalid coordinate")
  }
  if (value < min || value > max) {
    throw new Error("coordinate out of range")
  }
  return value
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const caller = await getCurrentEmployee()
  if (!caller || !canManageHr(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params
  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: currentBranch } = await supabase
    .from("hr_branches")
    .select("manager_employee_id, code")
    .eq("id", id)
    .maybeSingle()

  if (!currentBranch) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const headOffice = isHeadOfficeBranchCode(currentBranch.code as string | null)

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })
    updates.name = name
  }
  if (body.code !== undefined) {
    if (body.code === null || body.code === "") {
      return NextResponse.json({ error: "รหัสสาขาจำเป็นต้องระบุ" }, { status: 400 })
    }
    if (typeof body.code !== "string") {
      return NextResponse.json({ error: "code must be string" }, { status: 400 })
    }
    const nextCode = normalizeBranchCode(body.code)
    const codeError = canChangeBranchCode(
      currentBranch.code as string | null,
      nextCode
    )
    if (codeError) {
      return NextResponse.json({ error: codeError }, { status: 400 })
    }
    updates.code = nextCode
  }
  if (body.address !== undefined) {
    updates.address =
      typeof body.address === "string" && body.address.trim()
        ? body.address.trim()
        : null
  }
  if (body.managerEmployeeId !== undefined) {
    updates.manager_employee_id = body.managerEmployeeId || null
  }

  try {
    if (body.latitude !== undefined || body.longitude !== undefined) {
      const lat =
        body.latitude !== undefined
          ? parseCoord(body.latitude, -90, 90)
          : undefined
      const lng =
        body.longitude !== undefined
          ? parseCoord(body.longitude, -180, 180)
          : undefined

      if (
        (lat != null && lng == null) ||
        (lat == null && lng != null)
      ) {
        return NextResponse.json(
          { error: "latitude and longitude must both be set or both be null" },
          { status: 400 }
        )
      }

      if (lat !== undefined) updates.latitude = lat
      if (lng !== undefined) updates.longitude = lng
    }
  } catch {
    return NextResponse.json({ error: "invalid coordinates" }, { status: 400 })
  }

  if (body.geofence_enabled !== undefined) {
    if (headOffice && body.geofence_enabled) {
      return NextResponse.json(
        { error: "Head Office (000) ไม่รองรับ Geofence" },
        { status: 400 }
      )
    }
    if (typeof body.geofence_enabled !== "boolean") {
      return NextResponse.json(
        { error: "geofence_enabled must be boolean" },
        { status: 400 }
      )
    }
    updates.geofence_enabled = body.geofence_enabled
  }

  if (body.geofence_radius_m !== undefined) {
    const radius = body.geofence_radius_m
    if (
      typeof radius !== "number" ||
      !Number.isInteger(radius) ||
      radius < 1 ||
      radius > GEOFENCE_MAX_RADIUS_M
    ) {
      return NextResponse.json(
        { error: `geofence_radius_m must be 1–${GEOFENCE_MAX_RADIUS_M}` },
        { status: 400 }
      )
    }
    updates.geofence_radius_m = radius
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no changes" }, { status: 400 })
  }

  if (body.managerEmployeeId !== undefined) {
    const assignment = await applyBranchManagerAssignment(
      supabase,
      id,
      body.managerEmployeeId || null,
      (currentBranch.manager_employee_id as string | null) ?? null
    )
    if (!assignment.ok) {
      return NextResponse.json(
        { error: assignment.error },
        { status: assignment.status }
      )
    }
  }

  const { data, error } = await supabase
    .from("hr_branches")
    .update(updates)
    .eq("id", id)
    .select(
      "id, name, code, address, latitude, longitude, geofence_radius_m, geofence_enabled, manager_employee_id"
    )
    .maybeSingle()

  if (error) {
    const message =
      error.code === "23505"
        ? mapBranchCodeConflict(error.message)
        : error.message
    return NextResponse.json(
      { error: message },
      { status: error.code === "23505" ? 409 : 500 }
    )
  }
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 })

  return NextResponse.json(data)
}

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

  const { data: branch, error: branchError } = await supabase
    .from("hr_branches")
    .select("id, name")
    .eq("id", id)
    .maybeSingle()

  if (branchError) {
    return NextResponse.json({ error: branchError.message }, { status: 500 })
  }
  if (!branch) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  const { count: employeeCount, error: empError } = await supabase
    .from("hr_employees")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", id)

  if (empError) {
    return NextResponse.json({ error: empError.message }, { status: 500 })
  }
  if ((employeeCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `ไม่สามารถลบได้ — มีพนักงาน ${employeeCount} คนในสาขานี้` },
      { status: 400 }
    )
  }

  const { count: deptCount, error: deptError } = await supabase
    .from("hr_departments")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", id)

  if (deptError) {
    return NextResponse.json({ error: deptError.message }, { status: 500 })
  }
  if ((deptCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `ไม่สามารถลบได้ — มีแผนก ${deptCount} แผนกในสาขานี้` },
      { status: 400 }
    )
  }

  const { error } = await supabase.from("hr_branches").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
