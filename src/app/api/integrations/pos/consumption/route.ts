import { NextResponse, type NextRequest } from "next/server"

import { getRuntimeConfig } from "@/lib/runtime-config"
import { getAdminClient } from "@/lib/auth/admin-client"
import {
  buildPosConsumptionNotes,
  checkPosIntegrationRateLimit,
  extractIntegrationApiKey,
  isMatchingIntegrationApiKey,
  posConsumptionRequestSchema,
} from "@/lib/inventory/pos-integration"

async function getIntegrationActorCode(): Promise<string | null> {
  const envCode = process.env.POS_INVENTORY_EMPLOYEE_CODE?.trim()
  if (envCode) return envCode

  // ponytail: actor config stays env/runtime-config driven for now -> add admin UI only if ops needs self-service rotation.
  const runtimeCode = await getRuntimeConfig("pos_inventory_employee_code")
  return runtimeCode?.trim() || null
}

export async function POST(request: NextRequest) {
  // ponytail: process-local rate limit is enough for now -> move to shared store only if abuse/scale shows up.
  const rateLimit = checkPosIntegrationRateLimit(request.headers)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": String(rateLimit.retryAfterSeconds) },
      }
    )
  }

  const expectedApiKey = process.env.POS_INVENTORY_API_KEY?.trim()
  const providedApiKey = extractIntegrationApiKey(request.headers)

  if (!isMatchingIntegrationApiKey(expectedApiKey, providedApiKey)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const parsed = posConsumptionRequestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid payload",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    )
  }

  const actorCode = await getIntegrationActorCode()
  if (!actorCode) {
    return NextResponse.json(
      { error: "POS_INVENTORY_EMPLOYEE_CODE is not configured" },
      { status: 500 }
    )
  }

  const payload = parsed.data
  const admin = getAdminClient()

  const { data: actor, error: actorError } = await admin
    .from("hr_employees")
    .select("id, employee_code")
    .ilike("employee_code", actorCode)
    .eq("status", "active")
    .maybeSingle()

  if (actorError) {
    return NextResponse.json({ error: actorError.message }, { status: 500 })
  }
  if (!actor?.id) {
    return NextResponse.json(
      { error: `integration actor not found: ${actorCode}` },
      { status: 500 }
    )
  }

  const { data: branch, error: branchError } = await admin
    .from("inv_branches")
    .select("id, code")
    .ilike("code", payload.branch_code)
    .eq("is_active", true)
    .maybeSingle()

  if (branchError) {
    return NextResponse.json({ error: branchError.message }, { status: 500 })
  }
  if (!branch?.id) {
    return NextResponse.json(
      { error: `branch not found: ${payload.branch_code}` },
      { status: 404 }
    )
  }

  const { data: warehouse, error: warehouseError } = await admin
    .from("inv_warehouses")
    .select("id, code")
    .ilike("code", payload.warehouse_code)
    .eq("branch_id", branch.id)
    .eq("is_active", true)
    .maybeSingle()

  if (warehouseError) {
    return NextResponse.json({ error: warehouseError.message }, { status: 500 })
  }
  if (!warehouse?.id) {
    return NextResponse.json(
      {
        error: `warehouse not found for branch ${payload.branch_code}: ${payload.warehouse_code}`,
      },
      { status: 404 }
    )
  }

  const skuCodes = Array.from(new Set(payload.items.map((item) => item.sku_code.trim())))
  const { data: skuRows, error: skuError } = await admin
    .from("inv_skus")
    .select("id, code")
    .in("code", skuCodes)
    .eq("is_active", true)

  if (skuError) {
    return NextResponse.json({ error: skuError.message }, { status: 500 })
  }

  const skuMap = new Map(
    (skuRows ?? []).map((row) => [String(row.code).trim(), String(row.id)])
  )

  const missingCodes = skuCodes.filter((code) => !skuMap.has(code))
  if (missingCodes.length > 0) {
    return NextResponse.json(
      { error: `sku not found: ${missingCodes.join(", ")}` },
      { status: 404 }
    )
  }

  const eventInsert = await admin
    .from("inv_integration_events")
    .insert({
      source_system: payload.source_system,
      event_type: payload.event_type,
      external_ref: payload.external_ref,
      branch_id: branch.id,
      warehouse_id: warehouse.id,
      payload,
      status: "pending",
    })
    .select("id, status, consumption_ids")
    .single()

  if (eventInsert.error) {
    if (eventInsert.error.code === "23505") {
      const { data: existing, error: existingError } = await admin
        .from("inv_integration_events")
        .select("id, status, consumption_ids")
        .eq("source_system", payload.source_system)
        .eq("event_type", payload.event_type)
        .eq("external_ref", payload.external_ref)
        .maybeSingle()

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 })
      }

      return NextResponse.json(
        {
          ok: existing?.status === "processed",
          duplicate: true,
          event_id: existing?.id ?? null,
          status: existing?.status ?? "unknown",
          consumption_ids: existing?.consumption_ids ?? [],
        },
        { status: existing?.status === "processed" ? 200 : 409 }
      )
    }

    return NextResponse.json({ error: eventInsert.error.message }, { status: 500 })
  }

  const eventId = eventInsert.data.id as string
  const consumptionItems = payload.items.map((item) => ({
    sku_id: skuMap.get(item.sku_code.trim())!,
    qty: item.qty,
    consumption_type: item.consumption_type,
    notes: item.notes ?? null,
  }))

  const notes = buildPosConsumptionNotes(payload)
  const { data: ids, error: rpcError } = await admin.rpc("inv_record_pos_consumption", {
    p_recorded_by: actor.id,
    p_branch_id: branch.id,
    p_warehouse_id: warehouse.id,
    p_items: consumptionItems,
    p_notes: notes,
  })

  if (rpcError) {
    await admin
      .from("inv_integration_events")
      .update({
        status: "failed",
        error_message: rpcError.message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId)

    return NextResponse.json({ error: rpcError.message, event_id: eventId }, { status: 400 })
  }

  const consumptionIds = Array.isArray(ids) ? ids : []
  const { error: finalizeError } = await admin
    .from("inv_integration_events")
    .update({
      status: "processed",
      error_message: null,
      consumption_ids: consumptionIds,
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId)

  if (finalizeError) {
    return NextResponse.json(
      {
        ok: true,
        warning: finalizeError.message,
        event_id: eventId,
        consumption_ids: consumptionIds,
      },
      { status: 202 }
    )
  }

  return NextResponse.json({
    ok: true,
    event_id: eventId,
    consumption_ids: consumptionIds,
  })
}
