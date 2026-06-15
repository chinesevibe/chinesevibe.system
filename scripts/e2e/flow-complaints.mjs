#!/usr/bin/env node
import { createAssert } from "../test-helpers/assert.mjs"
import {
  cleanupE2eData,
  e2eLineId,
  insertEmployee,
  rest,
} from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-complaints")

export async function runFlowComplaints() {
  await cleanupE2eData()

  const emp = await insertEmployee({
    line_user_id: e2eLineId("cmp-emp"),
    name: "E2E Complaint Emp",
    role: "employee",
    status: "active",
    department: "Ops",
    position: "Staff",
  })

  const ticket = "HR-E2E01"
  const { data: row, error } = await rest("POST", "/rest/v1/hr_complaints", {
    employee_id: emp.id,
    ticket_code: ticket,
    subject: "E2E complaint",
    body: "Test complaint body for e2e",
    is_anonymous: false,
    status: "open",
  })

  ok(!error && row?.length === 1, "insert complaint")

  const id = row[0].id
  const { data: reply, error: replyErr } = await rest(
    "POST",
    "/rest/v1/hr_complaint_replies",
    {
      complaint_id: id,
      author_employee_id: emp.id,
      message: "HR reply e2e",
    }
  )
  ok(!replyErr && reply?.length === 1, "insert reply")

  return summary()
}
