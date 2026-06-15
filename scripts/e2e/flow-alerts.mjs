#!/usr/bin/env node
/**
 * T27 Flow 3 — probation alert row + HR-visible query (LINE push skipped).
 */
import { createAssert } from "../test-helpers/assert.mjs"
import {
  cleanupE2eData,
  e2eLineId,
  insertEmployee,
  rest,
} from "../test-helpers/supabase-admin.mjs"
import { loadEnv } from "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-alerts")

function ictToday() {
  const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
  return new Date(Date.now() + ICT_OFFSET_MS).toISOString().slice(0, 10)
}

function addDays(isoDate, days) {
  const ms = Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
}

export async function runFlowAlerts() {
  loadEnv()
  await cleanupE2eData()

  const today = ictToday()
  const probationEnd = addDays(today, 7)

  const employee = await insertEmployee({
    line_user_id: e2eLineId("alert"),
    name: "E2E Alert",
    role: "employee",
    status: "active",
    department: "QA",
    position: "Tester",
    probation_end: probationEnd,
  })

  const alertInsert = await rest("hr_alerts", {
    method: "POST",
    body: {
      employee_id: employee.id,
      alert_type: "probation_due",
      trigger_date: probationEnd,
      status: "pending",
    },
    prefer: "return=representation",
  })
  ok(alertInsert.ok, "hr_alerts row inserted")

  const alertQuery = await rest(
    `hr_alerts?employee_id=eq.${employee.id}&select=id,alert_type,status`
  )
  ok(alertQuery.ok, "alert query succeeds")
  ok((alertQuery.data?.length ?? 0) >= 1, "at least one alert row for employee")

  const probationQuery = await rest(
    `hr_employees?id=eq.${employee.id}&select=probation_end,status`
  )
  ok(probationQuery.ok, "employee probation query succeeds")
  ok(probationQuery.data?.[0]?.probation_end === probationEnd, "probation_end matches")

  const lineSkip = !process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (lineSkip) {
    console.log("  ⊘ LINE push skipped (no LINE_CHANNEL_ACCESS_TOKEN)")
  }

  await cleanupE2eData()
  const result = summary()
  result.skips = lineSkip ? ["LINE push"] : []
  return result
}

