#!/usr/bin/env node
import { createAssert } from "../test-helpers/assert.mjs"
import { rest } from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-settings")

const TEST_KEY = "work_start_hour"
const TEST_VAL = "9"

export async function runFlowSettings() {
  const upsert = await rest("hr_runtime_config", {
    method: "POST",
    body: { key: TEST_KEY, value: TEST_VAL },
    prefer: "resolution=merge-duplicates,return=representation",
  })
  ok(upsert.ok, "upsert hr_runtime_config")

  const read = await rest(`hr_runtime_config?key=eq.${TEST_KEY}&select=key,value`)
  ok(read.ok, "read hr_runtime_config")
  const row = Array.isArray(read.data) ? read.data[0] : null
  ok(row?.value === TEST_VAL, "value matches")

  return summary()
}
