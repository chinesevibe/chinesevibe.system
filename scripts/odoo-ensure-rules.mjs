#!/usr/bin/env node
/**
 * Ensure Thailand payroll salary rules on Odoo 19 structures + re-sync employees.
 */
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const Odoo = require("odoo-xmlrpc")

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const raw = readFileSync(resolve(root, ".env.local"), "utf8")
for (const line of raw.split("\n")) {
  const t = line.trim()
  if (!t || t.startsWith("#")) continue
  const eq = t.indexOf("=")
  if (eq > 0) process.env[t.slice(0, eq)] = t.slice(eq + 1)
}

class Client {
  constructor() {
    this.odoo = new Odoo({
      url: process.env.ODOO_URL,
      db: process.env.ODOO_DB,
      username: process.env.ODOO_USERNAME,
      password: process.env.ODOO_PASSWORD,
    })
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.odoo.connect((err, uid) => (err ? reject(err) : resolve(uid)))
    })
  }

  exec(model, method, args = [], kwargs = {}) {
    return new Promise((resolve, reject) => {
      this.odoo.execute_kw(model, method, [args, kwargs], (err, result) => {
        if (err) reject(new Error(`${model}.${method}: ${err}`))
        else resolve(result)
      })
    })
  }

  searchRead(model, domain, fields, limit) {
    const kwargs = { domain, fields }
    if (limit) kwargs.limit = limit
    return this.exec(model, "search_read", [], kwargs)
  }

  write(model, ids, values) {
    return this.exec(model, "write", [ids, values])
  }

  create(model, values) {
    return this.exec(model, "create", [values])
  }
}

async function categoryId(client, code, name) {
  const rows = await client.searchRead(
    "hr.salary.rule.category",
    [["code", "=", code]],
    ["id"],
    1
  )
  if (rows[0]?.id) return rows[0].id
  return client.create("hr.salary.rule.category", { code, name })
}

async function ensureRule(client, structId, spec) {
  const rows = await client.searchRead(
    "hr.salary.rule",
    [
      ["struct_id", "=", structId],
      ["code", "=", spec.code],
    ],
    ["id", "amount_python_compute"],
    1
  )
  const values = {
    name: spec.name,
    code: spec.code,
    struct_id: structId,
    category_ids: [[4, spec.categoryId]],
    condition_select: "none",
    amount_select: "code",
    amount_python_compute: spec.formula,
    sequence: spec.sequence,
  }
  if (rows[0]?.id) {
    await client.write("hr.salary.rule", [rows[0].id], values)
    console.log(`  updated rule ${spec.code} → id ${rows[0].id}`)
    return rows[0].id
  }
  const id = await client.create("hr.salary.rule", values)
  console.log(`  created rule ${spec.code} → id ${id}`)
  return id
}

async function ensureStructureRules(client, structId, wageType) {
  const basicCat = await categoryId(client, "BASIC", "Basic")
  const alwCat = await categoryId(client, "ALW", "Allowance")
  const dedCat = await categoryId(client, "DED", "Deduction")

  if (wageType === "monthly") {
    await ensureRule(client, structId, {
      code: "BASIC",
      name: "Basic Salary",
      categoryId: basicCat,
      sequence: 1,
      formula: "result = version.wage",
    })
    await ensureRule(client, structId, {
      code: "OT",
      name: "Overtime Pay",
      categoryId: alwCat,
      sequence: 2,
      formula:
        "result = (version.wage / 176.0) * 1.5 * worked_days.OT.number_of_hours",
    })
    await ensureRule(client, structId, {
      code: "SSO",
      name: "Social Security",
      categoryId: dedCat,
      sequence: 3,
      formula: "result = -min(750, version.wage * 0.05)",
    })
  } else {
    await ensureRule(client, structId, {
      code: "BASIC",
      name: "Hourly Wage",
      categoryId: basicCat,
      sequence: 1,
      formula:
        "result = version.hourly_wage * worked_days.WORK100.number_of_hours",
    })
    await ensureRule(client, structId, {
      code: "OT",
      name: "Overtime Pay",
      categoryId: alwCat,
      sequence: 2,
      formula:
        "result = version.hourly_wage * 1.5 * worked_days.OT.number_of_hours",
    })
    await ensureRule(client, structId, {
      code: "SSO",
      name: "Social Security",
      categoryId: dedCat,
      sequence: 3,
      formula: "result = -min(750, version.hourly_wage * 176 * 0.05)",
    })
  }
}

async function main() {
  const client = new Client()
  await client.connect()
  console.log("Connected to Odoo")

  const structs = await client.searchRead(
    "hr.payroll.structure",
    [
      "|",
      ["name", "=", "Monthly Salary - Thailand"],
      ["name", "=", "Hourly Wage - Thailand"],
    ],
    ["id", "name"],
    10
  )

  for (const s of structs) {
    console.log(`\nRules for "${s.name}" (id ${s.id})`)
    const wageType = s.name.includes("Hourly") ? "hourly" : "monthly"
    await ensureStructureRules(client, s.id, wageType)
  }

  console.log("\nRe-sync employees via odoo-setup-sync.mjs …")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
