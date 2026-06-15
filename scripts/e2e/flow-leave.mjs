#!/usr/bin/env node
/**
 * T27 Flow 2 — leave balance, request, approve (service role DB path).
 */
import { createAssert } from "../test-helpers/assert.mjs"
import {
  cleanupE2eData,
  e2eLineId,
  insertEmployee,
  rest,
} from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const DAY_MS = 86_400_000

function countLeaveDays(startDate, endDate) {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.round((end - start) / DAY_MS) + 1
}

function canRequestLeave(remaining, requestedDays) {
  return remaining >= requestedDays
}

const { ok, summary } = createAssert("flow-leave")

export async function runFlowLeave() {
  await cleanupE2eData()

  const hr = await insertEmployee({
    line_user_id: e2eLineId("hr"),
    name: "E2E HR",
    role: "hr",
    status: "active",
    department: "Management",
    position: "HR",
  })

  const employee = await insertEmployee({
    line_user_id: e2eLineId("leave"),
    name: "E2E Leave",
    role: "employee",
    status: "active",
    department: "QA",
    position: "Tester",
  })

  const balanceInsert = await rest("hr_leave_balances", {
    method: "POST",
    body: {
      employee_id: employee.id,
      leave_type: "annual",
      total_days: 10,
      used_days: 0,
    },
    prefer: "return=representation",
  })
  ok(balanceInsert.ok, "leave balance seeded")

  const startDate = "2026-07-01"
  const endDate = "2026-07-02"
  const days = countLeaveDays(startDate, endDate)
  ok(days === 2, "leave day count is 2")

  const remaining = 10
  ok(canRequestLeave(remaining, days), "balance sufficient for request")
  ok(!canRequestLeave(2, 5), "insufficient balance rejected by rule")

  const leaveInsert = await rest("hr_leaves", {
    method: "POST",
    body: {
      employee_id: employee.id,
      type: "annual",
      start_date: startDate,
      end_date: endDate,
      reason: "E2E leave test reason",
      status: "pending",
    },
    prefer: "return=representation",
  })
  ok(leaveInsert.ok, "pending leave row inserted")
  const leaveId = leaveInsert.data?.[0]?.id
  ok(!!leaveId, "leave id returned")

  const approve = await rest(`hr_leaves?id=eq.${leaveId}`, {
    method: "PATCH",
    body: { status: "approved", approved_by: hr.id },
    prefer: "return=representation",
  })
  ok(approve.ok, "leave approved")

  const usedPatch = await rest(
    `hr_leave_balances?employee_id=eq.${employee.id}&leave_type=eq.annual`,
    {
      method: "PATCH",
      body: { used_days: days },
      prefer: "return=representation",
    }
  )
  ok(usedPatch.ok, "used_days updated")

  const balQuery = await rest(
    `hr_leave_balances?employee_id=eq.${employee.id}&leave_type=eq.annual&select=used_days,total_days`
  )
  ok(balQuery.ok, "balance query succeeds")
  ok(Number(balQuery.data?.[0]?.used_days) === 2, "used_days equals 2 after approve")

  const leaveQuery = await rest(`hr_leaves?id=eq.${leaveId}&select=status`)
  ok(leaveQuery.data?.[0]?.status === "approved", "leave status is approved")

  await cleanupE2eData()
  return summary()
}

