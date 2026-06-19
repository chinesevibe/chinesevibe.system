import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  UNASSIGNED_SHIFT_ID,
  buildDailyRosterSnapshot,
} from "@/lib/attendance/daily-roster"

describe("buildDailyRosterSnapshot", () => {
  const shifts = [
    {
      id: "shift-a",
      code: "OFFICE",
      name: "Office",
      start_hour: 9,
      start_minute: 0,
      end_hour: 18,
      end_minute: 0,
      crosses_midnight: false,
      grace_minutes: 10,
      standard_hours: 9,
      is_active: true,
    },
  ]

  const employees = [
    {
      id: "emp-1",
      employee_code: "EMP-001",
      name: "Alice",
      position: "HR",
      department: "HR",
      branch_id: "branch-1",
      line_user_id: null,
      work_shift_id: "shift-a",
      default_check_in_time: "09:00:00",
      default_check_out_time: "18:00:00",
      hr_branches: { name: "HQ" },
    },
    {
      id: "emp-2",
      employee_code: "EMP-002",
      name: "Bob",
      position: "Ops Lead",
      department: "Ops",
      branch_id: "branch-1",
      line_user_id: null,
      work_shift_id: "shift-a",
      default_check_in_time: null,
      default_check_out_time: null,
      hr_branches: { name: "HQ" },
    },
    {
      id: "emp-3",
      employee_code: null,
      name: "Cara",
      position: "Ops",
      department: "Ops",
      branch_id: "branch-1",
      line_user_id: null,
      work_shift_id: "shift-a",
      default_check_in_time: null,
      default_check_out_time: null,
      hr_branches: { name: "HQ" },
    },
    {
      id: "emp-4",
      employee_code: null,
      name: "Dan",
      position: null,
      department: "Ops",
      branch_id: null,
      line_user_id: null,
      work_shift_id: null,
      default_check_in_time: null,
      default_check_out_time: null,
      hr_branches: null,
    },
  ]

  it("classifies checked-in, late, leave, absent, and unassigned employees", () => {
    const roster = buildDailyRosterSnapshot(
      {
        date: "2026-06-18",
        now: new Date("2026-06-18T03:30:00.000Z"),
        goLiveDate: "2026-06-18",
        employees,
        shifts,
      },
      [
        {
          employee_id: "emp-1",
          check_in_at: "2026-06-18T01:58:00.000Z",
          check_out_at: null,
          is_late: false,
          shift_date: "2026-06-18",
        },
        {
          employee_id: "emp-2",
          check_in_at: "2026-06-18T02:20:00.000Z",
          check_out_at: null,
          is_late: true,
          shift_date: "2026-06-18",
        },
      ],
      [{ employee_id: "emp-3", start_date: "2026-06-18", end_date: "2026-06-18" }]
    )

    assert.equal(roster.totals.total, 4)
    assert.equal(roster.totals.checkedIn, 2)
    assert.equal(roster.totals.late, 1)
    assert.equal(roster.totals.onLeave, 1)
    assert.equal(roster.totals.absent, 0)

    const officeGroup = roster.groups.find((group) => group.id === "shift-a")
    assert.ok(officeGroup)
    assert.equal(officeGroup.totals.checkedIn, 2)
    assert.equal(officeGroup.totals.onLeave, 1)
    assert.equal(
      officeGroup.employees.find((employee) => employee.id === "emp-2")?.status,
      "late"
    )
    assert.equal(
      officeGroup.employees.find((employee) => employee.id === "emp-1")?.employeeCode,
      "EMP-001"
    )
    assert.equal(
      officeGroup.employees.find((employee) => employee.id === "emp-2")?.position,
      "Ops Lead"
    )
    assert.equal(
      officeGroup.employees.find((employee) => employee.id === "emp-1")?.workTimeText,
      "08:58 – —"
    )
    assert.equal(
      officeGroup.employees.find((employee) => employee.id === "emp-1")?.employeeHref,
      "/admin/employees/emp-1/attendance?month=2026-06&date=2026-06-18"
    )

    const unassignedGroup = roster.groups.find((group) => group.id === UNASSIGNED_SHIFT_ID)
    assert.ok(unassignedGroup)
    assert.equal(unassignedGroup.employees[0]?.status, "unassigned")
  })

  it("groups employees by shift and sorts groups by shift start time", () => {
    const roster = buildDailyRosterSnapshot(
      {
        date: "2026-06-18",
        now: new Date("2026-06-18T00:00:00.000Z"),
        goLiveDate: "2026-06-18",
        employees: [
          employees[0],
          {
            id: "emp-5",
            employee_code: "EMP-005",
            name: "Fah",
            position: "Cashier",
            department: "Ops",
            branch_id: "branch-1",
            line_user_id: null,
            work_shift_id: "shift-b",
            default_check_in_time: "13:00:00",
            default_check_out_time: "22:00:00",
            hr_branches: { name: "HQ" },
          },
        ],
        shifts: [
          shifts[0],
          {
            id: "shift-b",
            code: "PM",
            name: "PM Shift",
            start_hour: 13,
            start_minute: 0,
            end_hour: 22,
            end_minute: 0,
            crosses_midnight: false,
            grace_minutes: 10,
            standard_hours: 9,
            is_active: true,
          },
        ],
      },
      [],
      []
    )

    assert.deepEqual(
      roster.groups.map((group) => group.id),
      ["shift-a", "shift-b"]
    )
    assert.deepEqual(
      roster.groups.map((group) => group.employees.map((employee) => employee.id)),
      [["emp-1"], ["emp-5"]]
    )
  })

  it("uses employee default_check_in_time over shift for late status", () => {
    const roster = buildDailyRosterSnapshot(
      {
        date: "2026-06-18",
        now: new Date("2026-06-18T04:00:00.000Z"),
        goLiveDate: "2026-06-18",
        employees: [
          {
            id: "emp-late-default",
            employee_code: "EMP-010",
            name: "Eve",
            position: "Staff",
            department: "Ops",
            branch_id: "branch-1",
            line_user_id: null,
            work_shift_id: "shift-a",
            default_check_in_time: "11:00:00",
            default_check_out_time: "20:00:00",
            hr_branches: { name: "HQ" },
          },
        ],
        shifts,
      },
      [
        {
          employee_id: "emp-late-default",
          check_in_at: "2026-06-18T03:05:00.000Z",
          check_out_at: null,
          is_late: true,
          shift_date: "2026-06-18",
        },
      ],
      []
    )

    const employee = roster.groups[0]?.employees[0]
    assert.equal(employee?.status, "present")
    assert.equal(roster.totals.late, 0)
  })

  it("ignores stale is_late when Branch Night check-in is before 14:00", () => {
    const branchNight = {
      id: "shift-night",
      code: "BRANCH_NIGHT",
      name: "Branch Night",
      start_hour: 14,
      start_minute: 0,
      end_hour: 2,
      end_minute: 0,
      crosses_midnight: true,
      grace_minutes: 10,
      standard_hours: 10,
      is_active: true,
    }
    const roster = buildDailyRosterSnapshot(
      {
        date: "2026-06-18",
        now: new Date("2026-06-18T08:00:00.000Z"),
        goLiveDate: "2026-06-18",
        employees: [
          {
            id: "emp-night",
            employee_code: "CNV022",
            name: "HninNu Swe",
            position: "Staff",
            department: "Ops",
            branch_id: "branch-1",
            line_user_id: null,
            work_shift_id: "shift-night",
            default_check_in_time: null,
            default_check_out_time: null,
            hr_branches: { name: "Branch" },
          },
        ],
        shifts: [branchNight],
      },
      [
        {
          employee_id: "emp-night",
          check_in_at: "2026-06-18T06:55:00.000Z",
          check_out_at: null,
          is_late: true,
          shift_date: "2026-06-18",
        },
      ],
      []
    )

    const employee = roster.groups[0]?.employees[0]
    assert.equal(employee?.status, "present")
    assert.equal(roster.totals.late, 0)
  })

  it("marks no-show employees absent after grace time passes", () => {
    const roster = buildDailyRosterSnapshot(
      {
        date: "2026-06-18",
        now: new Date("2026-06-18T04:00:00.000Z"),
        goLiveDate: "2026-06-18",
        employees: employees.slice(0, 1),
        shifts,
      },
      [],
      []
    )

    assert.equal(roster.totals.absent, 1)
    assert.equal(roster.groups[0]?.employees[0]?.status, "absent")
    assert.equal(roster.groups[0]?.state, "closed")
  })

  it("prefers the open or latest attendance row when an employee has duplicates", () => {
    const roster = buildDailyRosterSnapshot(
      {
        date: "2026-06-18",
        now: new Date("2026-06-18T08:00:00.000Z"),
        goLiveDate: "2026-06-18",
        employees: [
          {
            id: "emp-dup",
            employee_code: "EMP-020",
            name: "Nina",
            position: "Ops",
            department: "Ops",
            branch_id: "branch-1",
            line_user_id: null,
            work_shift_id: "shift-a",
            default_check_in_time: "09:00:00",
            default_check_out_time: "18:00:00",
            hr_branches: { name: "HQ" },
          },
        ],
        shifts,
      },
      [
        {
          employee_id: "emp-dup",
          check_in_at: "2026-06-18T02:00:00.000Z",
          check_out_at: "2026-06-18T09:00:00.000Z",
          is_late: false,
          shift_date: "2026-06-18",
        },
        {
          employee_id: "emp-dup",
          check_in_at: "2026-06-18T07:00:00.000Z",
          check_out_at: null,
          is_late: false,
          shift_date: "2026-06-18",
        },
      ],
      []
    )

    const employee = roster.groups[0]?.employees[0]
    assert.equal(employee?.checkedOutAt, null)
    assert.equal(employee?.note, "เข้า 14:00 • ยังไม่เช็คเอาท์")
    assert.equal(employee?.workTimeText, "14:00 – —")
  })

  it("keeps overnight carryover employees in Branch Night before everyone checks out", () => {
    const branchNight = {
      id: "shift-night",
      code: "BRANCH_NIGHT",
      name: "Branch Night",
      start_hour: 14,
      start_minute: 0,
      end_hour: 2,
      end_minute: 0,
      crosses_midnight: true,
      grace_minutes: 10,
      standard_hours: 10,
      is_active: true,
    }

    const roster = buildDailyRosterSnapshot(
      {
        date: "2026-06-19",
        now: new Date("2026-06-18T18:10:00.000Z"),
        goLiveDate: "2026-06-18",
        employees: [
          {
            id: "emp-night-open",
            employee_code: "EMP-030",
            name: "Open Night",
            position: "Ops",
            department: "Ops",
            branch_id: "branch-1",
            line_user_id: null,
            work_shift_id: "shift-night",
            default_check_in_time: null,
            default_check_out_time: null,
            hr_branches: { name: "Branch" },
          },
          {
            id: "emp-night-off",
            employee_code: "EMP-031",
            name: "Absent Night",
            position: "Ops",
            department: "Ops",
            branch_id: "branch-1",
            line_user_id: null,
            work_shift_id: "shift-night",
            default_check_in_time: null,
            default_check_out_time: null,
            hr_branches: { name: "Branch" },
          },
        ],
        shifts: [branchNight],
      },
      [
        {
          employee_id: "emp-night-open",
          check_in_at: "2026-06-18T07:00:00.000Z",
          check_out_at: null,
          is_late: false,
          shift_date: "2026-06-18",
        },
      ],
      []
    )

    assert.equal(roster.groups[0]?.state, "active")
    assert.equal(roster.groups[0]?.stateLabel, "ยังมีคนทำงานอยู่")
    assert.equal(
      roster.groups[0]?.employees.find((employee) => employee.id === "emp-night-open")?.status,
      "present"
    )
    assert.equal(
      roster.groups[0]?.employees.find((employee) => employee.id === "emp-night-off")?.status,
      "upcoming"
    )
    assert.equal(roster.totals.checkedIn, 1)
    assert.equal(roster.totals.absent, 0)
  })

  it("does not apply overnight carryover to whole shift when only some employees are open", () => {
    const branchNight = {
      id: "shift-night",
      code: "BRANCH_NIGHT",
      name: "Branch Night",
      start_hour: 14,
      start_minute: 0,
      end_hour: 2,
      end_minute: 0,
      crosses_midnight: true,
      grace_minutes: 10,
      standard_hours: 10,
      is_active: true,
    }

    const roster = buildDailyRosterSnapshot(
      {
        date: "2026-06-19",
        now: new Date("2026-06-19T01:30:00.000Z"),
        goLiveDate: "2026-06-18",
        employees: [
          {
            id: "emp-overnight",
            employee_code: "EMP-010",
            name: "Overnight Open",
            position: "Ops",
            department: "Ops",
            branch_id: "branch-1",
            line_user_id: null,
            work_shift_id: "shift-night",
            default_check_in_time: null,
            default_check_out_time: null,
            hr_branches: { name: "Branch" },
          },
          {
            id: "emp-midnight",
            employee_code: "EMP-011",
            name: "Midnight Checkin",
            position: "Ops",
            department: "Ops",
            branch_id: "branch-1",
            line_user_id: null,
            work_shift_id: "shift-night",
            default_check_in_time: null,
            default_check_out_time: null,
            hr_branches: { name: "Branch" },
          },
        ],
        shifts: [branchNight],
      },
      [
        {
          employee_id: "emp-overnight",
          check_in_at: "2026-06-18T07:10:00.000Z",
          check_out_at: null,
          is_late: false,
          shift_date: "2026-06-18",
        },
        {
          employee_id: "emp-midnight",
          check_in_at: "2026-06-18T18:10:00.000Z",
          check_out_at: null,
          is_late: false,
          shift_date: "2026-06-19",
        },
      ],
      []
    )

    const group = roster.groups[0]
    assert.equal(group.state, "active")

    const midnightEmployee = group.employees.find((employee) => employee.id === "emp-midnight")
    assert.ok(midnightEmployee)
    assert.equal(midnightEmployee?.status, "present")

    const overnightEmployee = group.employees.find((employee) => employee.id === "emp-overnight")
    assert.ok(overnightEmployee)
    assert.equal(overnightEmployee?.status, "present")
    assert.equal(roster.totals.checkedIn, 2)
  })
})
