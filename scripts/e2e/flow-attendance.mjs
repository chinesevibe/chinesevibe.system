#!/usr/bin/env node
/**
 * T27 Flow 1 — attendance check-in / check-out via service role (DB path).
 */
import { createAssert } from "../test-helpers/assert.mjs"
import {
  cleanupE2eData,
  e2eLineId,
  insertEmployee,
  rest,
} from "../test-helpers/supabase-admin.mjs"
import "../test-helpers/env.mjs"

const { ok, summary } = createAssert("flow-attendance")

export async function runFlowAttendance() {
  await cleanupE2eData()

  const lineUserId = e2eLineId("att")
  const employee = await insertEmployee({
    line_user_id: lineUserId,
    name: "E2E Attendance",
    role: "employee",
    status: "active",
    department: "QA",
    position: "Tester",
  })

  const checkInAt = new Date().toISOString()
  const insert = await rest("hr_attendance", {
    method: "POST",
    body: {
      employee_id: employee.id,
      check_in_at: checkInAt,
      check_in_location: { latitude: 13.75, longitude: 100.5, address: "E2E" },
      is_late: false,
    },
    prefer: "return=representation",
  })
  ok(insert.ok, "attendance check-in insert succeeds")
  const attendanceId = insert.data?.[0]?.id
  ok(!!attendanceId, "attendance row has id")

  const checkOutAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  const checkout = await rest(`hr_attendance?id=eq.${attendanceId}`, {
    method: "PATCH",
    body: { check_out_at: checkOutAt, work_hours: 8 },
    prefer: "return=representation",
  })
  ok(checkout.ok, "attendance check-out update succeeds")

  const query = await rest(
    `hr_attendance?employee_id=eq.${employee.id}&select=check_in_at,check_out_at,work_hours`
  )
  ok(query.ok, "attendance query succeeds")
  const row = query.data?.[0]
  ok(!!row?.check_in_at, "check_in_at present")
  ok(!!row?.check_out_at, "check_out_at present")
  ok(Number(row?.work_hours) === 8, "work_hours stored")

  await cleanupE2eData()
  return summary()
}

