// PATCH /api/admin/shifts/[id] — update shift fields (dev only)
import { NextResponse, type NextRequest } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { isDev } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

type PatchBody = {
  code?: string
  name?: string
  start_hour?: number
  start_minute?: number
  end_hour?: number
  end_minute?: number
  crosses_midnight?: boolean
  grace_minutes?: number
  check_in_early_minutes?: number
  standard_hours?: number
  is_active?: boolean
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await getCurrentEmployee()
  if (!caller || !isDev(caller.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = (await req.json()) as PatchBody

  const updates: Record<string, unknown> = {}
  if (body.code !== undefined) updates.code = body.code.toUpperCase().trim()
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.start_hour !== undefined) updates.start_hour = body.start_hour
  if (body.start_minute !== undefined) updates.start_minute = body.start_minute
  if (body.end_hour !== undefined) updates.end_hour = body.end_hour
  if (body.end_minute !== undefined) updates.end_minute = body.end_minute
  if (body.crosses_midnight !== undefined) updates.crosses_midnight = body.crosses_midnight
  if (body.grace_minutes !== undefined) updates.grace_minutes = body.grace_minutes
  if (body.check_in_early_minutes !== undefined) updates.check_in_early_minutes = body.check_in_early_minutes
  if (body.standard_hours !== undefined) updates.standard_hours = body.standard_hours
  if (body.is_active !== undefined) updates.is_active = body.is_active

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 })
  }

  const admin = getAdminClient()
  const { data, error } = await admin
    .from("hr_work_shifts")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
