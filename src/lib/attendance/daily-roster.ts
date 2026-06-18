import { BRANCH_VIA_EMPLOYEE } from "@/lib/supabase/branch-embeds"
import {
  formatEmployeeCode,
  formatEmployeeWorkTimeText,
} from "@/features/employees/data"
import { createClient } from "@/lib/supabase/server"
import { deriveAttendanceDayStatus } from "@/features/attendance/day-status"
import { formatShiftTimeRange } from "@/features/shifts/format"
import type { ShiftSchedule } from "@/lib/attendance/retro-limit"
import { getShiftStartUtc } from "@/lib/attendance/retro-limit"
import { ictDateFromUtc } from "@/lib/attendance/ict-datetime"
import { effectiveAttendanceIsLate } from "@/lib/attendance/late"
import { isEmployeeOffOnDate, parseOffDays } from "@/lib/employees/off-days"

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const UNASSIGNED_SHIFT_ID = "__unassigned__"

type RosterEmployeeRow = {
  id: string
  employee_code: string | null
  name: string
  position: string | null
  department: string | null
  branch_id: string | null
  line_user_id: string | null
  work_shift_id: string | null
  default_check_in_time: string | null
  default_check_out_time: string | null
  off_days?: number[] | null
  hr_branches: { name: string } | Array<{ name: string }> | null
}

type RosterShiftRow = {
  id: string
  code: string
  name: string
  start_hour: number
  start_minute: number
  end_hour: number
  end_minute: number
  crosses_midnight: boolean
  grace_minutes: number
  standard_hours: number
  is_active: boolean
}

type RosterAttendanceRow = {
  employee_id: string
  check_in_at: string
  check_out_at: string | null
  is_late: boolean
  shift_date: string | null
}

type RosterLeaveRow = {
  employee_id: string
  start_date: string
  end_date: string
}

export type DailyRosterFilters = {
  date: string
  branch_id?: string
  dept?: string
  shift_id?: string
  now?: Date
}

export type DailyRosterEmployeeStatus =
  | "present"
  | "late"
  | "on_leave"
  | "absent"
  | "off"
  | "pending"
  | "upcoming"
  | "unassigned"

export type DailyRosterGroupState =
  | "active"
  | "closed"
  | "grace"
  | "upcoming"
  | "unassigned"

export type DailyRosterEmployee = {
  id: string
  employeeCode: string
  name: string
  position: string | null
  department: string | null
  branchName: string | null
  employeeHref: string
  status: DailyRosterEmployeeStatus
  statusLabel: string
  note: string
  workTimeText: string
  checkedInAt: string | null
  checkedOutAt: string | null
  isLate: boolean
}

export type DailyRosterGroup = {
  id: string
  code: string | null
  name: string
  timeRange: string
  state: DailyRosterGroupState
  stateLabel: string
  startAt: string | null
  graceAt: string | null
  totals: {
    total: number
    checkedIn: number
    late: number
    onLeave: number
    absent: number
    pending: number
  }
  employees: DailyRosterEmployee[]
}

export type DailyRoster = {
  date: string
  today: string
  goLiveDate: string | null
  nextShiftId: string | null
  totals: {
    total: number
    checkedIn: number
    late: number
    onLeave: number
    absent: number
    pending: number
  }
  availableShifts: Array<{ id: string; label: string }>
  groups: DailyRosterGroup[]
}

type SnapshotInput = {
  date: string
  now: Date
  goLiveDate: string | null
  employees: RosterEmployeeRow[]
  shifts: RosterShiftRow[]
}

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

function ictTimeText(date: Date): string {
  const ictMs = date.getTime() + ICT_OFFSET_MS
  const minutesOfDay = Math.floor((ictMs % DAY_MS) / 60_000)
  return `${pad2(Math.floor(minutesOfDay / 60))}:${pad2(minutesOfDay % 60)}`
}

function ictDayRange(date: string): { start: Date; end: Date } {
  const [year, month, day] = date.split("-").map(Number)
  const start = new Date(Date.UTC(year, month - 1, day) - ICT_OFFSET_MS)
  return { start, end: new Date(start.getTime() + DAY_MS) }
}

function addIctDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function attendanceWorkDate(row: Pick<RosterAttendanceRow, "shift_date" | "check_in_at">): string {
  return row.shift_date ?? ictDateFromUtc(new Date(row.check_in_at))
}

function branchNameFromJoin(
  joined: RosterEmployeeRow["hr_branches"]
): string | null {
  if (!joined) return null
  return Array.isArray(joined) ? (joined[0]?.name ?? null) : joined.name
}

function scheduleFromShift(shift: RosterShiftRow): ShiftSchedule {
  return {
    start_hour: shift.start_hour,
    start_minute: shift.start_minute,
    end_hour: shift.end_hour,
    end_minute: shift.end_minute,
    crosses_midnight: shift.crosses_midnight,
    grace_minutes: shift.grace_minutes,
  }
}

function groupStateForDate(
  date: string,
  today: string,
  now: Date,
  shift: RosterShiftRow | null
): DailyRosterGroupState {
  if (!shift) return "unassigned"
  if (date > today) return "upcoming"
  if (date < today) return "closed"
  const startAt = getShiftStartUtc(date, scheduleFromShift(shift))
  const graceAt = new Date(startAt.getTime() + shift.grace_minutes * 60_000)
  if (now.getTime() < startAt.getTime()) return "upcoming"
  if (now.getTime() <= graceAt.getTime()) return "grace"
  return "closed"
}

function groupStateLabel(state: DailyRosterGroupState): string {
  if (state === "active") return "ยังมีคนทำงานอยู่"
  if (state === "upcoming") return "ยังไม่ถึงเวลา"
  if (state === "grace") return "รอครบเวลา grace"
  if (state === "unassigned") return "ยังไม่กำหนดกะ"
  return "เลยเวลาแล้ว"
}

function employeeStatusLabel(status: DailyRosterEmployeeStatus): string {
  if (status === "present") return "มาแล้ว"
  if (status === "late") return "มาสาย"
  if (status === "on_leave") return "ลา"
  if (status === "off") return "วันหยุด"
  if (status === "pending") return "รอก่อนครบ grace"
  if (status === "upcoming") return "ยังไม่ถึงเวลา"
  if (status === "unassigned") return "ไม่มีกะ"
  return "ขาด"
}

function employeeStatusFromDayStatus(
  dayStatus: ReturnType<typeof deriveAttendanceDayStatus>,
  shiftState: DailyRosterGroupState,
  record: RosterAttendanceRow | null
): DailyRosterEmployeeStatus {
  if (dayStatus === "on_leave") return "on_leave"
  if (!record && dayStatus === "in_progress" && shiftState === "closed") return "absent"
  if (dayStatus === "late") return "late"
  if (
    dayStatus === "complete" ||
    dayStatus === "in_progress" ||
    dayStatus === "missing_checkout"
  ) {
    return record?.is_late ? "late" : "present"
  }
  if (dayStatus === "future") {
    return shiftState === "grace" ? "pending" : "upcoming"
  }
  if (dayStatus === "missing_checkin") return "absent"
  return "unassigned"
}

function buildEmployeeNote(
  status: DailyRosterEmployeeStatus,
  record: RosterAttendanceRow | null,
  shiftState: DailyRosterGroupState
): string {
  if (record?.check_in_at) {
    const inText = ictTimeText(new Date(record.check_in_at))
    const outText = record.check_out_at
      ? ictTimeText(new Date(record.check_out_at))
      : "ยังไม่เช็คเอาท์"
    return `เข้า ${inText}${record.check_out_at ? ` • ออก ${outText}` : ` • ${outText}`}`
  }
  if (status === "on_leave") return "อนุมัติลาแล้ว"
  if (status === "off") return "วันหยุดประจำสัปดาห์"
  if (status === "pending") return "พ้นเวลาเข้างานแล้ว แต่ยังอยู่ในช่วง grace"
  if (status === "upcoming") return "ยังไม่ถึงเวลาเริ่มกะ"
  if (shiftState === "unassigned") return "ยังไม่ได้กำหนด work shift"
  return "ยังไม่มีการเช็คอิน"
}

function buildRosterWorkTimeText(
  employee: Pick<
    RosterEmployeeRow,
    "default_check_in_time" | "default_check_out_time" | "employee_code" | "id"
  >,
  shift: RosterShiftRow | null,
  record: RosterAttendanceRow | null
): string {
  if (record?.check_in_at) {
    const inText = ictTimeText(new Date(record.check_in_at))
    const outText = record.check_out_at
      ? ictTimeText(new Date(record.check_out_at))
      : "—"
    return `${inText} – ${outText}`
  }
  return formatEmployeeWorkTimeText({
    default_check_in_time: employee.default_check_in_time,
    default_check_out_time: employee.default_check_out_time,
    workShift: shift,
  })
}

function buildEmployeeAttendanceHref(employeeId: string, date: string): string {
  return `/admin/employees/${employeeId}/attendance?month=${date.slice(0, 7)}&date=${date}`
}

function shouldReplaceRosterRecord(
  current: RosterAttendanceRow | undefined,
  next: RosterAttendanceRow
): boolean {
  if (!current) return true
  if (current.check_out_at && !next.check_out_at) return true
  if (!current.check_out_at && next.check_out_at) return false
  return next.check_in_at > current.check_in_at
}

function isDateWithinRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

function isEmployeeOnLeave(
  leaves: RosterLeaveRow[],
  workDate: string
): boolean {
  return leaves.some((leave) => isDateWithinRange(workDate, leave.start_date, leave.end_date))
}

function pushCount(
  totals: DailyRoster["totals"] | DailyRosterGroup["totals"],
  status: DailyRosterEmployeeStatus
) {
  totals.total += 1
  if (status === "present" || status === "late") totals.checkedIn += 1
  if (status === "late") totals.late += 1
  if (status === "on_leave") totals.onLeave += 1
  if (status === "absent") totals.absent += 1
  if (status === "pending") totals.pending += 1
}

export function buildDailyRosterSnapshot(
  input: SnapshotInput,
  attendanceRows: RosterAttendanceRow[],
  leaveRows: RosterLeaveRow[]
): DailyRoster {
  const today = ictDateFromUtc(input.now)
  const previousDate = addIctDays(input.date, -1)
  const shiftById = new Map(input.shifts.map((shift) => [shift.id, shift]))
  const attendanceByEmployee = new Map<string, RosterAttendanceRow[]>()
  const employeeById = new Map(input.employees.map((employee) => [employee.id, employee]))
  const carryoverGroupDates = new Map<string, string>()

  for (const row of attendanceRows) {
    const existing = attendanceByEmployee.get(row.employee_id)
    if (existing) {
      existing.push(row)
    } else {
      attendanceByEmployee.set(row.employee_id, [row])
    }
  }

  if (input.date === today) {
    for (const row of attendanceRows) {
      if (row.check_out_at) continue
      if (attendanceWorkDate(row) !== previousDate) continue
      const employee = employeeById.get(row.employee_id)
      const shiftId = employee?.work_shift_id
      const shift = shiftId ? shiftById.get(shiftId) : null
      if (!shiftId || !shift?.crosses_midnight) continue
      carryoverGroupDates.set(shiftId, previousDate)
    }
  }

  for (const rows of attendanceByEmployee.values()) {
    rows.sort((left, right) => {
      if (left.check_out_at && !right.check_out_at) return 1
      if (!left.check_out_at && right.check_out_at) return -1
      return right.check_in_at.localeCompare(left.check_in_at)
    })
  }

  const leaveByEmployee = new Map<string, RosterLeaveRow[]>()
  for (const row of leaveRows) {
    const existing = leaveByEmployee.get(row.employee_id)
    if (existing) {
      existing.push(row)
    } else {
      leaveByEmployee.set(row.employee_id, [row])
    }
  }

  const groups = new Map<string, DailyRosterGroup>()
  const rosterTotals: DailyRoster["totals"] = {
    total: 0,
    checkedIn: 0,
    late: 0,
    onLeave: 0,
    absent: 0,
    pending: 0,
  }

  function ensureGroup(shiftId: string | null): DailyRosterGroup {
    const key = shiftId ?? UNASSIGNED_SHIFT_ID
    const existing = groups.get(key)
    if (existing) return existing

    const shift = shiftId ? (shiftById.get(shiftId) ?? null) : null
    const effectiveDate = carryoverGroupDates.get(key) ?? input.date
    const state = groupStateForDate(effectiveDate, today, input.now, shift)
    const startAt = shift ? getShiftStartUtc(effectiveDate, scheduleFromShift(shift)) : null
    const graceAt = startAt
      ? new Date(startAt.getTime() + shift!.grace_minutes * 60_000)
      : null

    const group: DailyRosterGroup = {
      id: key,
      code: shift?.code ?? null,
      name: shift?.name ?? "No shift assigned",
      timeRange: shift ? formatShiftTimeRange(shift) : "—",
      state,
      stateLabel: groupStateLabel(state),
      startAt: startAt?.toISOString() ?? null,
      graceAt: graceAt?.toISOString() ?? null,
      totals: {
        total: 0,
        checkedIn: 0,
        late: 0,
        onLeave: 0,
        absent: 0,
        pending: 0,
      },
      employees: [],
    }
    groups.set(key, group)
    return group
  }

  for (const employee of input.employees) {
    const group = ensureGroup(employee.work_shift_id)
    const shift = employee.work_shift_id
      ? (shiftById.get(employee.work_shift_id) ?? null)
      : null
    const groupDate = carryoverGroupDates.get(group.id) ?? input.date
    const onLeave = isEmployeeOnLeave(leaveByEmployee.get(employee.id) ?? [], groupDate)
    const offDays = parseOffDays(employee.off_days)
    if (!onLeave && isEmployeeOffOnDate(groupDate, offDays)) {
      const rosterEmployee: DailyRosterEmployee = {
        id: employee.id,
        employeeCode: formatEmployeeCode(employee),
        name: employee.name,
        position: employee.position,
        department: employee.department,
        branchName: branchNameFromJoin(employee.hr_branches),
        employeeHref: buildEmployeeAttendanceHref(employee.id, input.date),
        status: "off",
        statusLabel: employeeStatusLabel("off"),
        note: buildEmployeeNote("off", null, group.state),
        workTimeText: buildRosterWorkTimeText(employee, shift, null),
        checkedInAt: null,
        checkedOutAt: null,
        isLate: false,
      }
      group.employees.push(rosterEmployee)
      pushCount(group.totals, "off")
      pushCount(rosterTotals, "off")
      continue
    }

    const employeeRecords = attendanceByEmployee.get(employee.id) ?? []
    let record: RosterAttendanceRow | null = null
    for (const candidate of employeeRecords) {
      if (attendanceWorkDate(candidate) !== groupDate) continue
      if (shouldReplaceRosterRecord(record ?? undefined, candidate)) {
        record = candidate
      }
    }
    const effectiveIsLate = record
      ? effectiveAttendanceIsLate(
          record.check_in_at,
          shift,
          record.is_late,
          employee.default_check_in_time
        )
      : false
    const effectiveRecord = record
      ? { ...record, is_late: effectiveIsLate }
      : null
    const dayStatus = deriveAttendanceDayStatus(
      groupDate,
      today,
      input.now,
      shift ? scheduleFromShift(shift) : null,
      onLeave,
      effectiveRecord,
      input.goLiveDate
    )
    const status = employeeStatusFromDayStatus(dayStatus, group.state, effectiveRecord)
    const rosterEmployee: DailyRosterEmployee = {
      id: employee.id,
      employeeCode: formatEmployeeCode(employee),
      name: employee.name,
      position: employee.position,
      department: employee.department,
      branchName: branchNameFromJoin(employee.hr_branches),
      employeeHref: buildEmployeeAttendanceHref(employee.id, input.date),
      status,
      statusLabel: employeeStatusLabel(status),
      note: buildEmployeeNote(status, effectiveRecord, group.state),
      workTimeText: buildRosterWorkTimeText(employee, shift, effectiveRecord),
      checkedInAt: record?.check_in_at ?? null,
      checkedOutAt: record?.check_out_at ?? null,
      isLate: effectiveIsLate,
    }

    group.employees.push(rosterEmployee)
    pushCount(group.totals, status)
    pushCount(rosterTotals, status)
  }

  for (const group of groups.values()) {
    if (group.employees.some((employee) => employee.checkedInAt && !employee.checkedOutAt)) {
      group.state = "active"
      group.stateLabel = groupStateLabel("active")
    }
  }

  const sortedGroups = [...groups.values()].sort((left, right) => {
    if (left.id === UNASSIGNED_SHIFT_ID) return 1
    if (right.id === UNASSIGNED_SHIFT_ID) return -1
    if (left.startAt && right.startAt) return left.startAt.localeCompare(right.startAt)
    return left.name.localeCompare(right.name)
  })

  for (const group of sortedGroups) {
    group.employees.sort((left, right) => left.name.localeCompare(right.name, "th"))
  }

  return {
    date: input.date,
    today,
    goLiveDate: input.goLiveDate,
    nextShiftId:
      sortedGroups.find(
        (group) =>
          group.state === "active" ||
          group.state === "grace" ||
          group.state === "upcoming"
      )?.id ??
      null,
    totals: rosterTotals,
    availableShifts: sortedGroups.map((group) => ({
      id: group.id,
      label:
        group.id === UNASSIGNED_SHIFT_ID
          ? "No shift assigned"
          : `${group.name} • ${group.timeRange}`,
    })),
    groups: sortedGroups,
  }
}

const ROSTER_EMPLOYEE_SELECT_BASE =
  "id, employee_code, name, position, department, branch_id, line_user_id, work_shift_id, default_check_in_time, default_check_out_time"

const ROSTER_EMPLOYEE_SELECT_ATTEMPTS = [
  `${ROSTER_EMPLOYEE_SELECT_BASE}, off_days, ${BRANCH_VIA_EMPLOYEE}(name)`,
  `${ROSTER_EMPLOYEE_SELECT_BASE}, ${BRANCH_VIA_EMPLOYEE}(name)`,
]

async function loadRosterEmployees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: DailyRosterFilters
): Promise<RosterEmployeeRow[]> {
  let lastError: { message?: string } | null = null

  for (const select of ROSTER_EMPLOYEE_SELECT_ATTEMPTS) {
    let employeeQuery = supabase
      .from("hr_employees")
      .select(select)
      .eq("status", "active")
      .order("name")

    if (filters.branch_id === "__none__") {
      employeeQuery = employeeQuery.is("branch_id", null)
    } else if (filters.branch_id) {
      employeeQuery = employeeQuery.eq("branch_id", filters.branch_id)
    }
    if (filters.dept) {
      employeeQuery = employeeQuery.eq("department", filters.dept)
    }
    if (filters.shift_id === UNASSIGNED_SHIFT_ID) {
      employeeQuery = employeeQuery.is("work_shift_id", null)
    } else if (filters.shift_id) {
      employeeQuery = employeeQuery.eq("work_shift_id", filters.shift_id)
    }

    const { data, error } = await employeeQuery

    if (!error) {
      return ((data ?? []) as unknown as RosterEmployeeRow[]).filter(Boolean)
    }

    lastError = error
    if (!error.message?.includes("does not exist")) break
  }

  if (lastError) throw lastError
  return []
}

export async function getDailyRoster(filters: DailyRosterFilters): Promise<DailyRoster> {
  const supabase = await createClient()
  const now = filters.now ?? new Date()
  const today = ictDateFromUtc(now)
  const previousDate = addIctDays(filters.date, -1)
  const attendanceRangeDate =
    filters.date === today ? addIctDays(filters.date, -1) : filters.date
  const { start, end } = ictDayRange(attendanceRangeDate)

  const employeeRows = await loadRosterEmployees(supabase, filters)
  const employeeIds = employeeRows.map((employee) => employee.id)
  const shiftIds = [...new Set(employeeRows.map((employee) => employee.work_shift_id).filter(Boolean))]

  const shiftQuery = supabase
    .from("hr_work_shifts")
    .select(
      "id, code, name, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes, standard_hours, is_active"
    )
    .eq("is_active", true)

  const [shiftResult, configResult, attendanceResult, leaveResult] = await Promise.all([
    shiftIds.length > 0 ? shiftQuery.in("id", shiftIds) : Promise.resolve({ data: [], error: null }),
    supabase
      .from("hr_runtime_config")
      .select("value")
      .eq("key", "attendance_go_live_date")
      .maybeSingle(),
    employeeIds.length > 0
      ? supabase
          .from("hr_attendance")
          .select("employee_id, check_in_at, check_out_at, is_late, shift_date")
          .in("employee_id", employeeIds)
          .gte("check_in_at", start.toISOString())
          .lt(
            "check_in_at",
            filters.date === today
              ? new Date(end.getTime() + DAY_MS).toISOString()
              : end.toISOString()
          )
      : Promise.resolve({ data: [], error: null }),
    employeeIds.length > 0
      ? supabase
          .from("hr_leaves")
          .select("employee_id, start_date, end_date")
          .in("employee_id", employeeIds)
          .eq("status", "approved")
          .lte("start_date", filters.date)
          .gte("end_date", filters.date === today ? previousDate : filters.date)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (shiftResult.error) throw shiftResult.error
  if (configResult.error) throw configResult.error
  if (attendanceResult.error) throw attendanceResult.error
  if (leaveResult.error) throw leaveResult.error

  return buildDailyRosterSnapshot(
    {
      date: filters.date,
      now,
      goLiveDate: (configResult.data?.value as string | null) ?? null,
      employees: employeeRows,
      shifts: (shiftResult.data ?? []) as RosterShiftRow[],
    },
    (attendanceResult.data ?? []) as RosterAttendanceRow[],
    (leaveResult.data ?? []) as RosterLeaveRow[]
  )
}

export { UNASSIGNED_SHIFT_ID }
