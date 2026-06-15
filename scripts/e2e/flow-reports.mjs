#!/usr/bin/env node
import { createAssert } from "../test-helpers/assert.mjs"
import {
  cleanupE2eData,
  e2eLineId,
  insertEmployee,
  rest,
} from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-reports")

export async function runFlowReports() {
  await cleanupE2eData()

  const emp = await insertEmployee({
    line_user_id: e2eLineId("reports"),
    name: "E2E Reports",
    role: "employee",
    status: "active",
    department: "Finance",
  })

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const att = await rest("hr_attendance", {
    method: "POST",
    body: {
      employee_id: emp.id,
      check_in_at: new Date().toISOString(),
      is_late: false,
    },
    prefer: "return=representation",
  })
  ok(att.ok, "insert attendance row")

  const query = await rest(
    `hr_attendance?select=id,check_in_at,hr_employees(department)&check_in_at=gte.${since}&hr_employees.department=eq.Finance&limit=5`
  )
  ok(query.ok, "filtered attendance query")

  const leaves = await rest("hr_leaves?select=id,status&limit=1")
  ok(leaves.ok, "leave report query")

  const ot = await rest("hr_overtime_requests?select=id,status&limit=1")
  ok(ot.ok, "overtime report query")

  return summary()
}
