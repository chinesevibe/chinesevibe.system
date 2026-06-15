#!/usr/bin/env node
/**
 * T27 — run all E2E integration flows.
 */
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { loadEnv } from "../test-helpers/env.mjs"
import { runFlowAlerts } from "./flow-alerts.mjs"
import { runFlowAttendance } from "./flow-attendance.mjs"
import { runFlowLeave } from "./flow-leave.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const reportPath = resolve(root, "reports/E2E_T27_RESULTS.md")

async function main() {
  loadEnv()
  console.log("T27 E2E — starting flows\n")

  const results = []
  const flows = [
    ["attendance", runFlowAttendance],
    ["leave", runFlowLeave],
    ["alerts", runFlowAlerts],
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
      console.error(err)
    }
    console.log("")
  }

  const skips = results.flatMap((r) => r.skips ?? [])
  const uniqueSkips = [...new Set(skips)]

  const md = `# E2E T27 Results

**Date:** ${new Date().toISOString()}
**Command:** \`npm run test:e2e\`
**Overall:** ${allOk ? "PASS" : "FAIL"}

## Flow Summary

| Flow | Passed | Failed | Status |
|------|--------|--------|--------|
${results
  .map(
    (r) =>
      `| ${r.flowName} | ${r.passed} | ${r.failed} | ${r.ok ? "PASS" : "FAIL"} |`
  )
  .join("\n")}

## Skips

${
  uniqueSkips.length
    ? uniqueSkips.map((s) => `- ${s}`).join("\n")
    : "- None"
}

## Errors

${
  results.some((r) => r.errors?.length)
    ? results
        .filter((r) => r.errors?.length)
        .map((r) => `### ${r.flowName}\n${r.errors.map((e) => `- ${e}`).join("\n")}`)
        .join("\n\n")
    : "None"
}

## Environment

- Supabase: local/remote via \`.env.local\`
- LINE live push: ${uniqueSkips.includes("LINE push") ? "skipped" : "not required for gate"}
`

  writeFileSync(reportPath, md, "utf8")
  console.log(`Report: ${reportPath}`)
  console.log(allOk ? "\n✅ All E2E flows passed" : "\n❌ E2E failures")
  process.exit(allOk ? 0 : 1)
}

main()
