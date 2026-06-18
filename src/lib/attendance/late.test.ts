import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  DEFAULT_LATE_GRACE_MINUTES,
  effectiveAttendanceIsLate,
  lateMinutes,
  lateMinutesAtCheckIn,
  lateMinutesForShift,
  lateMinutesWithGrace,
  type ShiftLateSchedule,
} from "@/lib/attendance/late"

const BRANCH_NIGHT: ShiftLateSchedule = {
  start_hour: 14,
  start_minute: 0,
  crosses_midnight: true,
  grace_minutes: 10,
}

function ictUtc(isoDate: string, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number)
  const [y, mo, d] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h - 7, m))
}

describe("lateMinutesForShift", () => {
  it("Branch Night: check-in before 14:00 is not late", () => {
    const at10 = ictUtc("2026-06-18", "10:00")
    const at1355 = ictUtc("2026-06-18", "13:55")
    assert.equal(lateMinutesForShift(at10, BRANCH_NIGHT), 0)
    assert.equal(lateMinutesForShift(at1355, BRANCH_NIGHT), 0)
  })

  it("Branch Night: within grace after 14:00 is not late", () => {
    const at1405 = ictUtc("2026-06-18", "14:05")
    assert.equal(lateMinutesForShift(at1405, BRANCH_NIGHT), 0)
  })

  it("Branch Night: after grace counts late minutes", () => {
    const at1411 = ictUtc("2026-06-18", "14:11")
    assert.equal(lateMinutesForShift(at1411, BRANCH_NIGHT), 1)
  })

  it("global 09:00 marks 10:00 late but shift path does not", () => {
    const at10 = ictUtc("2026-06-18", "10:00")
    assert.equal(lateMinutes(at10, 9, 0), 60)
    assert.equal(
      lateMinutesAtCheckIn(at10, BRANCH_NIGHT, { hour: 9, minute: 0 }),
      0
    )
  })

  it("employee default_check_in_time overrides shift start", () => {
    const at10 = ictUtc("2026-06-18", "10:00")
    assert.equal(
      lateMinutesAtCheckIn(at10, BRANCH_NIGHT, { hour: 9, minute: 0 }, "11:00"),
      0
    )
    const at1111 = ictUtc("2026-06-18", "11:11")
    assert.equal(
      lateMinutesAtCheckIn(
        at1111,
        BRANCH_NIGHT,
        { hour: 9, minute: 0 },
        "11:00"
      ),
      1
    )
  })

  it("employee default without shift uses default grace", () => {
    const at911 = ictUtc("2026-06-18", "09:11")
    assert.equal(
      lateMinutesAtCheckIn(at911, null, { hour: 9, minute: 0 }, "09:00"),
      1
    )
    assert.equal(DEFAULT_LATE_GRACE_MINUTES, 10)
    assert.equal(lateMinutesWithGrace(at911, 9, 0, 10), 1)
  })

  it("effectiveAttendanceIsLate recomputes from employee default time", () => {
    const checkInAt = ictUtc("2026-06-18", "10:00").toISOString()
    assert.equal(
      effectiveAttendanceIsLate(checkInAt, BRANCH_NIGHT, true, "11:00"),
      false
    )
  })
})
