#!/usr/bin/env node
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { getLoadedEnvPath, loadEnv } from "../test-helpers/env.mjs"
import { runFlowLifecycle } from "./flow-lifecycle.mjs"
import { runFlowReports } from "./flow-reports.mjs"
import { runFlowSettings } from "./flow-settings.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const reportPath = resolve(root, "reports/E2E_P4_RESULTS.md")

async function main() {
  loadEnv()
  console.log(`Phase 4 E2E — env: ${getLoadedEnvPath()}\n`)

  const results = []
  const flows = [
    ["settings-runtime", runFlowSettings],
    ["reports-data", runFlowReports],
    ["lifecycle", runFlowLifecycle],
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
    "# E2E Phase 4 Results",
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
