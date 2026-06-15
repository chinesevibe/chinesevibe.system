#!/usr/bin/env node
/**
 * One-shot: ensure Odoo payroll config + sync all active HR employees.
 * Usage: node scripts/odoo-setup-sync.mjs
 */

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const require = createRequire(import.meta.url)
const Odoo = require("odoo-xmlrpc")

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function loadEnv() {
  const envPath = resolve(root, ".env.local")
  const raw = readFileSync(envPath, "utf8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq)
    const value = trimmed.slice(eq + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

function resolvePayDay(nationality, explicit) {
  if (explicit === 4 || explicit === 5) return explicit
  if (nationality === "chinese") return 5
  return 4
}

function odooPayTag(payDay) {
  return payDay === 5 ? "Pay-05" : "Pay-04"
}

class OdooClient {
  constructor(config) {
    this.odoo = new Odoo(config)
    this.uid = null
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.odoo.connect((err, uid) => {
        if (err) reject(err)
        else {
          this.uid = uid
          resolve(uid)
        }
      })
    })
  }

  execute(model, method, args = [], kwargs = {}) {
    return new Promise((resolve, reject) => {
      this.odoo.execute_kw(model, method, [args, kwargs], (err, result) => {
        if (err) reject(new Error(`${model}.${method}: ${err}`))
        else resolve(result)
      })
    })
  }

  async searchRead(model, domain, fields, limit) {
    const kwargs = { domain, fields }
    if (limit) kwargs.limit = limit
    return this.execute(model, "search_read", [], kwargs)
  }

  async create(model, values) {
    return this.execute(model, "create", [values])
  }

  async write(model, ids, values) {
    return this.execute(model, "write", [ids, values])
  }

  async findOrCreate(model, domain, values) {
    const rows = await this.searchRead(model, domain, ["id"], 1)
    if (rows[0]?.id) return rows[0].id
    return this.create(model, values)
  }
}

const WORK_ENTRIES = [
  { name: "Regular Work", code: "WORK100", sequence: 1 },
  { name: "Overtime", code: "OT", sequence: 2 },
  { name: "Sick Leave", code: "LEAVE110", sequence: 3 },
  { name: "Annual Leave", code: "LEAVE120", sequence: 4 },
]

async function ensureWorkEntryTypes(client) {
  for (const entry of WORK_ENTRIES) {
    const id = await client.findOrCreate(
      "hr.work.entry.type",
      [["code", "=", entry.code]],
      {
        name: entry.name,
        code: entry.code,
        sequence: entry.sequence,
      }
    )
    console.log(`  work entry ${entry.code} → id ${id}`)
  }
}

async function ensureStructureType(client, name, wageType) {
  const rows = await client.searchRead(
    "hr.payroll.structure.type",
    [["name", "=", name]],
    ["id"],
    1
  )
  if (rows[0]?.id) return rows[0].id
  return client.create("hr.payroll.structure.type", {
    name,
    wage_type: wageType,
  })
}

async function ensureSalaryStructure(client, structName, wageType) {
  const existing = await client.searchRead(
    "hr.payroll.structure",
    [["name", "=", structName]],
    ["id", "name"],
    1
  )
  if (existing[0]?.id) {
    console.log(`  structure "${structName}" already exists → id ${existing[0].id}`)
    return existing[0].id
  }

  const structTypeName = wageType === "monthly" ? "Regular Pay" : "Hourly Pay"
  const structTypeId = await ensureStructureType(client, structTypeName, wageType)

  const structId = await client.create("hr.payroll.structure", {
    name: structName,
    type_id: structTypeId,
  })

  console.log(
    `  created structure "${structName}" → id ${structId} (add salary rules in Odoo UI if payslip compute fails)`
  )
  return structId
}

async function ensurePayTag(client, odooEmployeeId, payDay) {
  const tagName = odooPayTag(payDay)
  const tagId = await client.findOrCreate(
    "hr.employee.category",
    [["name", "=", tagName]],
    { name: tagName }
  )
  await client.write("hr.employee", [odooEmployeeId], {
    category_ids: [[4, tagId]],
  })
}

async function syncEmployeeVersion(client, odooEmployeeId, emp, structId, payType) {
  const versions = await client.searchRead(
    "hr.version",
    [["employee_id", "=", odooEmployeeId]],
    ["id", "date_start"],
    10
  )

  const dateStart =
    emp.contract_start?.slice?.(0, 10) ??
    emp.created_at?.slice?.(0, 10) ??
    new Date().toISOString().slice(0, 10)

  const versionValues = {
    structure_id: structId,
    contract_date_start: dateStart,
    date_start: dateStart,
    is_in_contract: true,
  }

  if (payType === "monthly") {
    versionValues.wage_type = "monthly"
    versionValues.wage = Number(emp.salary)
  } else {
    versionValues.wage_type = "hourly"
    versionValues.hourly_wage = Number(emp.salary)
  }

  const target =
    versions.sort((a, b) => String(b.date_start).localeCompare(String(a.date_start)))[0] ??
    null

  if (target?.id) {
    await client.write("hr.version", [target.id], versionValues)
    return target.id
  }

  return client.create("hr.version", {
    employee_id: odooEmployeeId,
    ...versionValues,
  })
}

async function syncEmployee(client, emp, structIds) {
  const payDay = resolvePayDay(emp.nationality, emp.pay_day)
  const payType = emp.pay_type === "monthly" ? "monthly" : "hourly"
  const structId = payType === "monthly" ? structIds.monthly : structIds.hourly

  const existing = await client.searchRead(
    "hr.employee",
    [["identification_id", "=", emp.id]],
    ["id"],
    1
  )

  const employeeData = {
    name: emp.name,
    identification_id: emp.id,
  }
  if (emp.position) employeeData.job_title = emp.position
  if (emp.email) employeeData.work_email = emp.email
  if (emp.employee_code) employeeData.barcode = emp.employee_code

  let odooEmployeeId = existing[0]?.id
  if (odooEmployeeId) {
    await client.write("hr.employee", [odooEmployeeId], employeeData)
  } else {
    odooEmployeeId = await client.create("hr.employee", employeeData)
  }

  await ensurePayTag(client, odooEmployeeId, payDay)

  if (!emp.salary || Number(emp.salary) <= 0) {
    return { name: emp.name, status: "employee_only", odooEmployeeId, payType, payDay }
  }

  await syncEmployeeVersion(client, odooEmployeeId, emp, structId, payType)

  return { name: emp.name, status: "synced", odooEmployeeId, payType, payDay }
}

async function fetchEmployees(supabase) {
  let { data: employees, error } = await supabase
    .from("hr_employees")
    .select(
      "id, name, position, department, email, employee_code, salary, pay_type, nationality, pay_day, contract_start, created_at, status"
    )
    .eq("status", "active")
    .order("name")

  if (error?.message?.includes("nationality") || error?.message?.includes("pay_day")) {
    const fallback = await supabase
      .from("hr_employees")
      .select(
        "id, name, position, department, email, employee_code, salary, pay_type, contract_start, created_at, status"
      )
      .eq("status", "active")
      .order("name")
    if (fallback.error) throw fallback.error
    employees = (fallback.data ?? []).map((e) => ({
      ...e,
      nationality: null,
      pay_day: 4,
    }))
    return employees
  }

  if (error) throw error
  return employees ?? []
}

async function main() {
  loadEnv()

  const odoo = new OdooClient({
    url: process.env.ODOO_URL,
    db: process.env.ODOO_DB,
    username: process.env.ODOO_USERNAME,
    password: process.env.ODOO_PASSWORD,
  })

  console.log("Connecting to Odoo…")
  const uid = await odoo.connect()
  console.log(`Connected (uid=${uid})`)

  console.log("\n1) Work entry types")
  await ensureWorkEntryTypes(odoo)

  console.log("\n2) Salary structures")
  const monthlyId = await ensureSalaryStructure(odoo, "Monthly Salary - Thailand", "monthly")
  const hourlyId = await ensureSalaryStructure(odoo, "Hourly Wage - Thailand", "hourly")

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log("\n3) Fetch employees from Supabase")
  const employees = await fetchEmployees(supabase)
  console.log(`   ${employees.length} active employees`)

  console.log("\n4) Sync employees → Odoo")
  const results = []
  for (const emp of employees) {
    try {
      const result = await syncEmployee(odoo, emp, {
        monthly: monthlyId,
        hourly: hourlyId,
      })
      results.push(result)
      console.log(
        `   ✓ ${result.name} (${result.status}${result.payType ? `, ${result.payType}, pay day ${result.payDay ?? "—"}` : ""})`
      )
    } catch (err) {
      results.push({ name: emp.name, status: "error", error: String(err) })
      console.log(`   ✗ ${emp.name}: ${err.message || err}`)
    }
  }

  const synced = results.filter((r) => r.status === "synced").length
  const employeeOnly = results.filter((r) => r.status === "employee_only").length
  const failed = results.filter((r) => r.status === "error").length

  console.log("\nDone.")
  console.log(`  synced with contract: ${synced}`)
  console.log(`  employee only (no salary): ${employeeOnly}`)
  console.log(`  failed: ${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
