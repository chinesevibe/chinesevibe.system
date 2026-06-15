#!/usr/bin/env node
import { createAssert } from "../test-helpers/assert.mjs"
import {
  cleanupE2eData,
  e2eLineId,
  insertEmployee,
  rest,
} from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-lifecycle")

export async function runFlowLifecycle() {
  await cleanupE2eData()

  const emp = await insertEmployee({
    line_user_id: e2eLineId("lifecycle"),
    name: "E2E Lifecycle",
    role: "employee",
    status: "active",
    department: "QA",
    probation_end: "2026-12-31",
    contract_end: "2026-12-31",
  })

  const patch = await rest(`hr_employees?id=eq.${emp.id}`, {
    method: "PATCH",
    body: { probation_outcome: "passed", probation_outcome_note: "E2E pass" },
    prefer: "return=representation",
  })
  ok(patch.ok, "update probation outcome")

  const note = await rest("hr_compliance_notes", {
    method: "POST",
    body: {
      employee_id: emp.id,
      category: "probation",
      note: "E2E compliance note",
    },
    prefer: "return=representation",
  })
  ok(note.ok, "insert compliance note")

  const read = await rest(
    `hr_compliance_notes?employee_id=eq.${emp.id}&select=id,category`
  )
  ok(read.ok && Array.isArray(read.data) && read.data.length >= 1, "read compliance notes")

  return summary()
}
