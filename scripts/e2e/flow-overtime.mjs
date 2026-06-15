#!/usr/bin/env node
import { createAssert } from "../test-helpers/assert.mjs"
import {
  cleanupE2eData,
  e2eLineId,
  insertEmployee,
  rest,
} from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-overtime")

export async function runFlowOvertime() {
  await cleanupE2eData()

  const emp = await insertEmployee({
    line_user_id: e2eLineId("ot"),
    name: "E2E OT",
    role: "employee",
    status: "active",
    department: "QA",
  })

  const workDate = new Date().toISOString().slice(0, 10)
  const ins = await rest("hr_overtime_requests", {
    method: "POST",
    body: {
      employee_id: emp.id,
      work_date: workDate,
      start_time: "18:00",
      end_time: "20:00",
      reason: "E2E P3 overtime smoke",
      status: "pending",
    },
    prefer: "return=representation",
  })

  ok(ins.ok, "insert overtime row")
  const row = Array.isArray(ins.data) ? ins.data[0] : ins.data
  ok(row?.status === "pending", "status pending")

  if (row?.id) {
    await rest(`hr_overtime_requests?id=eq.${row.id}`, { method: "DELETE" })
  }

  return summary()
}
