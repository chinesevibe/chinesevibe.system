#!/usr/bin/env node
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { getLoadedEnvPath, loadEnv } from "../test-helpers/env.mjs"
import { runFlowAnnouncements } from "./flow-announcements.mjs"
import { runFlowOvertime } from "./flow-overtime.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const reportPath = resolve(root, "reports/E2E_P3_RESULTS.md")

async function main() {
  loadEnv()
  console.log(`Phase 3 E2E — env: ${getLoadedEnvPath()}\n`)

  const results = []
  const flows = [
    ["overtime", runFlowOvertime],
    ["announcements-scheduled", runFlowAnnouncements],
  ]

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
    "# E2E Phase 3 Results",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Overall: ${allOk ? "PASS" : "FAIL"}`,
    "",
    ...results.flatMap((r) => [
      `## ${r.flowName}`,
      `- passed: ${r.passed}`,
      `- failed: ${r.failed}`,
      ...(r.errors?.length ? r.errors.map((e) => `- error: ${e}`) : []),
      "",
    ]),
  ].join("\n")

  writeFileSync(reportPath, md)
  console.log(`\nReport: ${reportPath}`)
  process.exit(allOk ? 0 : 1)
}

main()
