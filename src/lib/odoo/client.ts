/**
 * Odoo XML-RPC Client for Payroll Integration
 *
 * Syncs employee data, contracts, and payslips to Odoo ERP.
 */

import type { PayrollConfig } from "@/lib/payroll/config"
import type { PayType } from "@/lib/payroll/pay-type"
import {
  computePaymentDate,
  odooPayTag,
  type PayDay,
} from "@/lib/payroll/pay-day"

interface OdooConfig {
  url: string
  db: string
  username: string
  password: string
}

interface OdooConnection {
  connect(callback: (err: unknown, uid: number) => void): void
  execute_kw(
    model: string,
    method: string,
    params: unknown[],
    callback: (err: unknown, result: unknown) => void
  ): void
}

export interface EmployeeSyncData {
  id: string
  name: string
  position?: string | null
  department?: string | null
  email?: string | null
  employee_code?: string | null
  pay_day?: PayDay
}

export interface ContractSyncData {
  odooEmployeeId: number
  pay_type: PayType
  salary: number
  contract_start?: string | null
  created_at?: string | null
}

export interface PayslipData {
  employee_id: string
  pay_type: PayType
  pay_day: PayDay
  period: string
  period_start: string
  period_end: string
  worked_hours: number
  overtime_hours: number
  sick_leave_hours?: number
  annual_leave_hours?: number
}

export interface PayslipBatchResult {
  pay_day: PayDay
  payment_date: string
  batch_id: number | null
  payslip_ids: number[]
}

export interface PayslipResult {
  payslip_id: number
  employee_id: string
}

export class OdooClient {
  private odoo: OdooConnection | null = null
  private uid: number | null = null
  private config: OdooConfig
  private workEntryCache = new Map<string, number>()
  private structCache = new Map<string, number>()
  private categoryCache = new Map<string, number>()

  constructor(config?: Partial<OdooConfig>) {
    this.config = {
      url: config?.url || process.env.ODOO_URL || "http://localhost:8069",
      db: config?.db || process.env.ODOO_DB || "hr_payroll",
      username: config?.username || process.env.ODOO_USERNAME || "admin",
      password: config?.password || process.env.ODOO_PASSWORD || "admin",
    }
  }

  private async initConnection(): Promise<void> {
    if (this.odoo) return

    try {
      // odoo-xmlrpc is CommonJS-only
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Odoo = require("odoo-xmlrpc")
      this.odoo = new Odoo({
        url: this.config.url,
        db: this.config.db,
        username: this.config.username,
        password: this.config.password,
      })
    } catch (error) {
      throw new Error(
        `Failed to initialize Odoo connection: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  async connect(): Promise<number> {
    if (this.uid) return this.uid

    await this.initConnection()

    return new Promise((resolve, reject) => {
      if (!this.odoo) {
        return reject(new Error("Odoo connection not initialized"))
      }

      this.odoo.connect((err: unknown, uid: number) => {
        if (err) {
          reject(new Error(`Odoo authentication failed: ${err instanceof Error ? err.message : String(err)}`))
        } else {
          this.uid = uid
          resolve(uid)
        }
      })
    })
  }

  /** Odoo 19+ expects keyword args as a separate mapping. */
  private async execute<T = unknown>(
    model: string,
    method: string,
    params: unknown[]
  ): Promise<T> {
    await this.connect()

    return new Promise((resolve, reject) => {
      if (!this.odoo) {
        return reject(new Error("Odoo connection not initialized"))
      }

      this.odoo.execute_kw(model, method, params, (err: unknown, result: unknown) => {
        if (err) {
          reject(new Error(`Odoo ${model}.${method} failed: ${err instanceof Error ? err.message : String(err)}`))
        } else {
          resolve(result as T)
        }
      })
    })
  }

  async search(model: string, domain: unknown[]): Promise<number[]> {
    return this.execute<number[]>(model, "search", [[], { domain }])
  }

  async searchRead(
    model: string,
    domain: unknown[],
    fields: string[],
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    const kwargs: Record<string, unknown> = { domain, fields }
    if (limit !== undefined) kwargs.limit = limit
    return this.execute<Record<string, unknown>[]>(model, "search_read", [[], kwargs])
  }

  async read(model: string, ids: number[], fields: string[]): Promise<Record<string, unknown>[]> {
    return this.execute<Record<string, unknown>[]>(model, "read", [[ids], { fields }])
  }

  async create(model: string, values: Record<string, unknown>): Promise<number> {
    return this.execute<number>(model, "create", [[values]])
  }

  async write(model: string, ids: number[], values: Record<string, unknown>): Promise<boolean> {
    return this.execute<boolean>(model, "write", [[ids, values]])
  }

  async resolveWorkEntryTypeId(code: string): Promise<number> {
    const cached = this.workEntryCache.get(code)
    if (cached !== undefined) return cached

    const rows = await this.searchRead(
      "hr.work.entry.type",
      [["code", "=", code]],
      ["id"],
      1
    )
    const id = rows[0]?.id as number | undefined
    if (!id) {
      throw new Error(`Work entry type "${code}" not found in Odoo`)
    }
    this.workEntryCache.set(code, id)
    return id
  }

  async resolveStructId(name: string): Promise<number> {
    const cached = this.structCache.get(name)
    if (cached !== undefined) return cached

    const rows = await this.searchRead(
      "hr.payroll.structure",
      [["name", "=", name]],
      ["id"],
      1
    )
    const id = rows[0]?.id as number | undefined
    if (!id) {
      throw new Error(`Salary structure "${name}" not found in Odoo`)
    }
    this.structCache.set(name, id)
    return id
  }

  async resolveEmployeeCategoryId(name: string): Promise<number> {
    const cached = this.categoryCache.get(name)
    if (cached !== undefined) return cached

    const rows = await this.searchRead(
      "hr.employee.category",
      [["name", "=", name]],
      ["id"],
      1
    )
    let id = rows[0]?.id as number | undefined
    if (!id) {
      id = await this.create("hr.employee.category", { name })
    }
    this.categoryCache.set(name, id)
    return id
  }

  async syncEmployeePayTag(odooEmployeeId: number, payDay: PayDay): Promise<void> {
    const tagName = odooPayTag(payDay)
    const otherTag = odooPayTag(payDay === 4 ? 5 : 4)
    const tagId = await this.resolveEmployeeCategoryId(tagName)

    try {
      const otherId = await this.resolveEmployeeCategoryId(otherTag)
      await this.execute("hr.employee", "write", [
        [[odooEmployeeId], { category_ids: [[3, otherId]] }],
      ])
    } catch {
      // other tag may not exist yet — safe to ignore
    }

    await this.execute("hr.employee", "write", [
      [[odooEmployeeId], { category_ids: [[4, tagId]] }],
    ])
  }

  async syncEmployee(employee: EmployeeSyncData): Promise<number> {
    try {
      const existing = await this.searchRead(
        "hr.employee",
        [["identification_id", "=", employee.id]],
        ["id"],
        1
      )

      const employeeData: Record<string, unknown> = {
        name: employee.name,
        identification_id: employee.id,
      }

      if (employee.position) employeeData.job_title = employee.position
      if (employee.department) employeeData.department_id = false
      if (employee.email) employeeData.work_email = employee.email
      if (employee.employee_code) employeeData.barcode = employee.employee_code

      const existingId = existing[0]?.id as number | undefined
      if (existingId) {
        await this.write("hr.employee", [existingId], employeeData)
        if (employee.pay_day) {
          await this.syncEmployeePayTag(existingId, employee.pay_day)
        }
        return existingId
      }

      const createdId = await this.create("hr.employee", employeeData)
      if (employee.pay_day) {
        await this.syncEmployeePayTag(createdId, employee.pay_day)
      }
      return createdId
    } catch (error) {
      throw new Error(
        `Failed to sync employee ${employee.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  async syncContract(
    data: ContractSyncData,
    payrollConfig: PayrollConfig
  ): Promise<number> {
    try {
      const structName =
        data.pay_type === "monthly"
          ? payrollConfig.odoo_monthly_struct_name
          : payrollConfig.odoo_hourly_struct_name
      const structId = await this.resolveStructId(structName)

      const dateStart =
        data.contract_start?.slice(0, 10) ??
        data.created_at?.slice(0, 10) ??
        new Date().toISOString().slice(0, 10)

      const versionValues: Record<string, unknown> = {
        structure_id: structId,
        contract_date_start: dateStart,
        date_start: dateStart,
        is_in_contract: true,
      }

      if (data.pay_type === "monthly") {
        versionValues.wage_type = "monthly"
        versionValues.wage = data.salary
      } else {
        versionValues.wage_type = "hourly"
        versionValues.hourly_wage = data.salary
      }

      try {
        const versions = await this.searchRead(
          "hr.version",
          [["employee_id", "=", data.odooEmployeeId]],
          ["id", "date_start"],
          10
        )
        const sorted = [...versions].sort((a, b) =>
          String(b.date_start ?? "").localeCompare(String(a.date_start ?? ""))
        )
        const versionId = sorted[0]?.id as number | undefined
        if (versionId) {
          await this.write("hr.version", [versionId], versionValues)
          return versionId
        }
        return await this.create("hr.version", {
          employee_id: data.odooEmployeeId,
          ...versionValues,
        })
      } catch (versionError) {
        const message =
          versionError instanceof Error ? versionError.message : String(versionError)
        if (!message.includes("hr.version")) {
          throw versionError
        }
      }

      const contractValues: Record<string, unknown> = {
        name: `Contract ${data.odooEmployeeId}`,
        employee_id: data.odooEmployeeId,
        struct_id: structId,
        date_start: dateStart,
        state: "open",
      }

      if (data.pay_type === "monthly") {
        contractValues.wage_type = "monthly"
        contractValues.wage = data.salary
      } else {
        contractValues.wage_type = "hourly"
        contractValues.hourly_wage = data.salary
      }

      const existing = await this.searchRead(
        "hr.contract",
        [
          ["employee_id", "=", data.odooEmployeeId],
          ["state", "=", "open"],
        ],
        ["id"],
        1
      )

      const existingId = existing[0]?.id as number | undefined
      if (existingId) {
        await this.write("hr.contract", [existingId], contractValues)
        return existingId
      }

      return await this.create("hr.contract", contractValues)
    } catch (error) {
      throw new Error(
        `Failed to sync contract: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  async createPayslip(
    data: PayslipData,
    payrollConfig: PayrollConfig
  ): Promise<PayslipResult> {
    try {
      const matches = await this.searchRead(
        "hr.employee",
        [["identification_id", "=", data.employee_id]],
        ["id"],
        1
      )

      if (matches.length === 0) {
        throw new Error(
          `Employee ${data.employee_id} not found in Odoo. Please sync employee first.`
        )
      }

      const odooEmployeeId = matches[0].id as number
      const workedDaysLines: unknown[] = []

      const addLine = async (
        name: string,
        hours: number,
        code: string
      ) => {
        if (hours <= 0) return
        const workEntryTypeId = await this.resolveWorkEntryTypeId(code)
        workedDaysLines.push([
          0,
          0,
          {
            name,
            number_of_hours: hours,
            work_entry_type_id: workEntryTypeId,
          },
        ])
      }

      if (data.pay_type === "hourly") {
        await addLine("Regular Work", data.worked_hours, payrollConfig.work_entry_regular)
      }

      await addLine("Overtime", data.overtime_hours, payrollConfig.work_entry_ot)
      await addLine("Sick Leave", data.sick_leave_hours ?? 0, payrollConfig.work_entry_sick)
      await addLine("Annual Leave", data.annual_leave_hours ?? 0, payrollConfig.work_entry_annual)

      const paymentDate = computePaymentDate(data.period, data.pay_day)
      const payslipName = `${data.period} — จ่าย ${paymentDate} (${odooPayTag(data.pay_day)})`

      const payslipId = await this.create("hr.payslip", {
        name: payslipName,
        employee_id: odooEmployeeId,
        date_from: data.period_start,
        date_to: data.period_end,
        worked_days_line_ids: workedDaysLines,
        note: `Payment date: ${paymentDate} · Pay group: ${odooPayTag(data.pay_day)}`,
      })

      await this.execute("hr.payslip", "compute_sheet", [[payslipId]])

      return {
        payslip_id: payslipId,
        employee_id: data.employee_id,
      }
    } catch (error) {
      throw new Error(
        `Failed to create payslip for ${data.employee_id}: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  async createPayslipBatch(input: {
    period: string
    payDay: PayDay
    periodStart: string
    periodEnd: string
    payslipIds: number[]
  }): Promise<PayslipBatchResult> {
    const paymentDate = computePaymentDate(input.period, input.payDay)
    const result: PayslipBatchResult = {
      pay_day: input.payDay,
      payment_date: paymentDate,
      batch_id: null,
      payslip_ids: input.payslipIds,
    }

    if (input.payslipIds.length === 0) return result

    const batchName = `${input.period} — ${odooPayTag(input.payDay)} (จ่าย ${paymentDate})`
    const batchValues: Record<string, unknown> = {
      name: batchName,
      date_start: input.periodStart,
      date_end: input.periodEnd,
      slip_ids: [[6, 0, input.payslipIds]],
    }

    for (const model of ["hr.payslip.run", "hr.payslip.batch"] as const) {
      try {
        const batchId = await this.create(model, batchValues)
        result.batch_id = batchId
        return result
      } catch {
        // try alternate model name (Odoo version differences)
      }
    }

    return result
  }

  async getPayslip(payslipId: number): Promise<Record<string, unknown> | null> {
    try {
      const payslips = await this.read("hr.payslip", [payslipId], [
        "employee_id",
        "date_from",
        "date_to",
        "line_ids",
        "state",
      ])
      return payslips[0] ?? null
    } catch (error) {
      throw new Error(
        `Failed to get payslip ${payslipId}: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; uid?: number }> {
    try {
      const uid = await this.connect()
      return {
        success: true,
        message: "Connected to Odoo successfully",
        uid,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

export const createOdooClient = (config?: Partial<OdooConfig>) => {
  return new OdooClient(config)
}
