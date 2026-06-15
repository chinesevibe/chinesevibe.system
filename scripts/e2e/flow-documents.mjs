#!/usr/bin/env node
import { createAssert } from "../test-helpers/assert.mjs"
import {
  cleanupE2eData,
  e2eLineId,
  insertEmployee,
  rest,
} from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-documents")

export async function runFlowDocuments() {
  await cleanupE2eData()

  const emp = await insertEmployee({
    line_user_id: e2eLineId("doc-emp"),
    name: "E2E Doc Emp",
    role: "employee",
    status: "active",
    department: "Engineering",
    position: "Dev",
  })

  const { data: row, error } = await rest("POST", "/rest/v1/hr_document_requests", {
    employee_id: emp.id,
    doc_type: "employment_cert",
    copies: 2,
    purpose: "E2E test document request",
    status: "pending",
  })

  ok(!error && row?.length === 1, "insert document request")
  const id = row[0].id

  const { data: updated, error: updErr } = await rest(
    "PATCH",
    `/rest/v1/hr_document_requests?id=eq.${id}`,
    { status: "processing" }
  )
  ok(!updErr && updated?.[0]?.status === "processing", "advance status")

  return summary()
}
