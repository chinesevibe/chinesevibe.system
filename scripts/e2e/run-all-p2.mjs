#!/usr/bin/env node
import { writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { loadEnv } from "../test-helpers/env.mjs"
import { runFlowAnnouncements } from "./flow-announcements.mjs"
import { runFlowComplaints } from "./flow-complaints.mjs"
import { runFlowDocuments } from "./flow-documents.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const reportPath = resolve(root, "reports/E2E_P2_RESULTS.md")

async function main() {
  loadEnv()
  console.log("Phase 2 E2E — starting flows\n")

  const results = []
  const flows = [
    ["documents", runFlowDocuments],
    ["complaints", runFlowComplaints],
    ["announcements", runFlowAnnouncements],
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

  const md = `# E2E Phase 2 Results

**Date:** ${new Date().toISOString()}
**Command:** \`node scripts/e2e/run-all-p2.mjs\`
**Overall:** ${allOk ? "PASS" : "FAIL"}

| Flow | Passed | Failed | Status |
|------|--------|--------|--------|
${results.map((r) => `| ${r.flowName} | ${r.passed} | ${r.failed} | ${r.ok ? "PASS" : "FAIL"} |`).join("\n")}
`

  writeFileSync(reportPath, md, "utf8")
  console.log(`Report: ${reportPath}`)
  process.exit(allOk ? 0 : 1)
}

main()
