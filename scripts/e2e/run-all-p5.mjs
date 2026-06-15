#!/usr/bin/env node
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { createAssert } from "../test-helpers/assert.mjs"
import { rest, insertEmployee, cleanupE2eData, e2eLineId } from "../test-helpers/supabase-admin.mjs"
import { getLoadedEnvPath, loadEnv } from "../test-helpers/env.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const reportPath = resolve(root, "reports/E2E_P5_RESULTS.md")

async function flowBranches() {
  const { ok, summary } = createAssert("flow-branches")
  const list = await rest("hr_branches?select=id,name&limit=1")
  ok(list.ok, "list branches")
  return summary()
}

async function flowApprovalColumns() {
  const { ok, summary } = createAssert("flow-approval-schema")
  await cleanupE2eData()
  const emp = await insertEmployee({
    line_user_id: e2eLineId("p5"),
    name: "E2E P5",
    role: "employee",
    status: "active",
  })
  const ins = await rest("hr_leaves", {
    method: "POST",
    body: {
      employee_id: emp.id,
      type: "sick",
      start_date: "2026-06-10",
      end_date: "2026-06-10",
      reason: "E2E hourly sick test",
      status: "pending",
      leave_unit: "hours",
      leave_hours: 2,
      approval_status: "pending_manager",
    },
    prefer: "return=representation",
  })
  ok(ins.ok, "insert leave with approval_status")
  return summary()
}

async function main() {
  loadEnv()
  console.log(`Phase 5 E2E — env: ${getLoadedEnvPath()}\n`)

  const flows = [
    ["branches", flowBranches],
    ["approval-schema", flowApprovalColumns],
  ]

  const results = []
  let allOk = true
  for (const [name, fn] of flows) {
    console.log(`▶ ${name}`)
    try {
      const r = await fn()
      results.push(r)
      if (!r.ok) allOk = false
    } catch (err) {
      allOk = false
      results.push({
        flowName: name,
        passed: 0,
        failed: 1,
        errors: [String(err?.message ?? err)],
        ok: false,
      })
    }
  }

  const md = [
    "# E2E Phase 5 Results",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Overall: ${allOk ? "PASS" : "FAIL"}`,
    "",
    ...results.flatMap((r) => [
      `## ${r.flowName}`,
      `- passed: ${r.passed}`,
      `- failed: ${r.failed}`,
      "",
    ]),
  ].join("\n")

  writeFileSync(reportPath, md)
  console.log(`\nReport: ${reportPath}`)
  process.exit(allOk ? 0 : 1)
}

main()
