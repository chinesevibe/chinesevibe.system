const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const UNASSIGNED_SHIFT_ID = "__unassigned__";

type EmployeeRow = {
  id: string;
  employee_code: string | null;
  name: string;
  position: string | null;
  department: string | null;
  branch_id: string | null;
  work_shift_id: string | null;
  default_check_in_time: string | null;
  default_check_out_time: string | null;
  hr_branches: { name: string } | Array<{ name: string }> | null;
};

type ShiftRow = {
  id: string;
  code: string;
  name: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  crosses_midnight: boolean;
  grace_minutes: number;
  standard_hours: number;
  is_active: boolean;
};

type AttendanceRow = {
  employee_id: string;
  check_in_at: string;
  check_out_at: string | null;
  is_late: boolean;
  shift_date: string | null;
};

export type DailyRosterEmployeeStatus =
  | "present"
  | "late"
  | "on_leave"
  | "absent"
  | "off"
  | "pending"
  | "upcoming"
  | "unassigned";

export type DailyRosterGroupState = "closed" | "grace" | "upcoming" | "unassigned";

export type DailyRosterEmployee = {
  id: string;
  employeeCode: string;
  name: string;
  position: string | null;
  department: string | null;
  branchName: string | null;
  status: DailyRosterEmployeeStatus;
  statusLabel: string;
  note: string;
  workTimeText: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  isLate: boolean;
};

export type DailyRosterGroup = {
  id: string;
  code: string | null;
  name: string;
  timeRange: string;
  state: DailyRosterGroupState;
  stateLabel: string;
  startAt: string | null;
  graceAt: string | null;
  totals: {
    total: number;
    checkedIn: number;
    late: number;
    onLeave: number;
    absent: number;
    pending: number;
  };
  employees: DailyRosterEmployee[];
};

export type DailyRoster = {
  date: string;
  today: string;
  goLiveDate: string | null;
  nextShiftId: string | null;
  totals: {
    total: number;
    checkedIn: number;
    late: number;
    onLeave: number;
    absent: number;
    pending: number;
  };
  groups: DailyRosterGroup[];
};

type QueryResponse<T> = { data: T | null; error: Error | null };

export interface AdminQueryBuilder<T> extends PromiseLike<QueryResponse<T>> {
  select(columns: string): AdminQueryBuilder<T>;
  eq(column: string, value: unknown): AdminQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): AdminQueryBuilder<T>;
  in(column: string, values: unknown[]): AdminQueryBuilder<T>;
  gte(column: string, value: string): AdminQueryBuilder<T>;
  lt(column: string, value: string): AdminQueryBuilder<T>;
  lte(column: string, value: string): AdminQueryBuilder<T>;
  not(column: string, operator: string, value: unknown): AdminQueryBuilder<T>;
  maybeSingle(): PromiseLike<QueryResponse<T>>;
  upsert(value: Record<string, unknown>): PromiseLike<QueryResponse<T>>;
}

export interface AdminClient {
  from<T = unknown>(table: string): AdminQueryBuilder<T>;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function ictDateString(date: Date): string {
  return new Date(date.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function ictDayRange(date: string): { start: Date; end: Date } {
  const [year, month, day] = date.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - ICT_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

function ictTimeText(date: Date): string {
  const ictMs = date.getTime() + ICT_OFFSET_MS;
  const minutesOfDay = Math.floor((ictMs % DAY_MS) / 60_000);
  return `${pad2(Math.floor(minutesOfDay / 60))}:${pad2(minutesOfDay % 60)}`;
}

function ictDayStartUtc(date: Date): Date {
  const ictMs = date.getTime() + ICT_OFFSET_MS;
  const ictDayStartMs = Math.floor(ictMs / DAY_MS) * DAY_MS;
  return new Date(ictDayStartMs - ICT_OFFSET_MS);
}

function lateMinutesForShift(checkInAt: Date, shift: ShiftRow): number {
  return lateMinutesWithGrace(
    checkInAt,
    shift.start_hour,
    shift.start_minute,
    shift.grace_minutes,
  );
}

const DEFAULT_LATE_GRACE_MINUTES = 10;

function normalizeTimeToHHMM(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(trimmed);
  if (!match) return trimmed;
  const hour = Number.parseInt(match[1], 10);
  const minute = match[2];
  if (hour < 0 || hour > 23) return trimmed;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function parseEmployeeCheckInTime(
  value: string | null | undefined,
): { hour: number; minute: number } | null {
  const normalized = normalizeTimeToHHMM(value);
  if (!normalized) return null;
  const [hour, minute] = normalized.split(":").map(Number);
  return { hour, minute };
}

function lateMinutesWithGrace(
  checkInAt: Date,
  startHour: number,
  startMinute: number,
  graceMinutes: number,
): number {
  const dayStart = ictDayStartUtc(checkInAt);
  const startMinutes = startHour * 60 + startMinute;
  const checkInMinutes = Math.floor(
    ((checkInAt.getTime() - dayStart.getTime()) / 60_000 + 24 * 60) % (24 * 60),
  );
  if (checkInMinutes < startMinutes) return 0;
  return Math.max(0, checkInMinutes - graceMinutes - startMinutes);
}

function lateMinutesAtCheckIn(
  checkInAt: Date,
  shift: ShiftRow | null,
  fallbackStart: { hour: number; minute: number },
  defaultCheckInTime?: string | null,
): number {
  const employeeStart = parseEmployeeCheckInTime(defaultCheckInTime);
  if (employeeStart) {
    const grace = shift?.grace_minutes ?? DEFAULT_LATE_GRACE_MINUTES;
    return lateMinutesWithGrace(
      checkInAt,
      employeeStart.hour,
      employeeStart.minute,
      grace,
    );
  }
  if (shift) return lateMinutesForShift(checkInAt, shift);
  const dayStart = ictDayStartUtc(checkInAt);
  const workStartMs =
    dayStart.getTime() +
    (fallbackStart.hour * 60 + fallbackStart.minute) * 60_000;
  return Math.max(0, Math.floor((checkInAt.getTime() - workStartMs) / 60_000));
}

function effectiveAttendanceIsLate(
  checkInAt: string,
  shift: ShiftRow | null,
  storedIsLate: boolean,
  defaultCheckInTime?: string | null,
): boolean {
  if (defaultCheckInTime || shift) {
    return (
      lateMinutesAtCheckIn(
        new Date(checkInAt),
        shift,
        { hour: 9, minute: 0 },
        defaultCheckInTime,
      ) > 0
    );
  }
  return storedIsLate;
}

function branchNameFromJoin(
  joined: EmployeeRow["hr_branches"],
): string | null {
  if (!joined) return null;
  return Array.isArray(joined) ? (joined[0]?.name ?? null) : joined.name;
}

function formatShiftTimeRange(
  shift: Pick<
    ShiftRow,
    "start_hour" | "start_minute" | "end_hour" | "end_minute"
  >,
): string {
  return `${pad2(shift.start_hour)}:${pad2(shift.start_minute)}–${pad2(shift.end_hour)}:${pad2(shift.end_minute)}`;
}

function formatEmployeeCode(input: {
  employee_code: string | null;
  id: string;
}): string {
  return input.employee_code?.trim() || input.id.slice(0, 8).toUpperCase();
}

function formatEmployeeWorkTimeText(input: {
  default_check_in_time: string | null;
  default_check_out_time: string | null;
  workShift:
    | Pick<
      ShiftRow,
      "start_hour" | "start_minute" | "end_hour" | "end_minute"
    >
    | null;
}): string {
  const checkIn = normalizeTimeToHHMM(input.default_check_in_time);
  const checkOut = normalizeTimeToHHMM(input.default_check_out_time);
  if (checkIn && checkOut) {
    return `${checkIn} – ${checkOut}`;
  }
  if (input.workShift) {
    return formatShiftTimeRange(input.workShift).replace("–", " – ");
  }
  return "—";
}

function getShiftStartUtc(workDate: string, shift: ShiftRow): Date {
  const [year, month, day] = workDate.split("-").map(Number);
  const ictMs = Date.UTC(
    year,
    month - 1,
    day,
    shift.start_hour,
    shift.start_minute,
    0,
    0,
  );
  return new Date(ictMs - ICT_OFFSET_MS);
}

function getShiftEndUtc(workDate: string, shift: ShiftRow): Date {
  const [year, month, day] = workDate.split("-").map(Number);
  const dayOffset = shift.crosses_midnight ? 1 : 0;
  const ictMs = Date.UTC(
    year,
    month - 1,
    day + dayOffset,
    shift.end_hour,
    shift.end_minute,
    0,
    0,
  );
  return new Date(ictMs - ICT_OFFSET_MS);
}

function deriveDayStatus(
  date: string,
  today: string,
  now: Date,
  shift: ShiftRow | null,
  onLeave: boolean,
  record: AttendanceRow | null,
  goLiveDate: string | null,
): "future" | "on_leave" | "late" | "complete" | "in_progress" | "missing_checkin" | "missing_checkout" | "no_shift" {
  if (goLiveDate && date < goLiveDate) return "no_shift";
  if (date > today) return "future";
  if (onLeave) return "on_leave";
  if (!shift) return "no_shift";

  const shiftStart = getShiftStartUtc(date, shift);
  const shiftEnd = getShiftEndUtc(date, shift);
  const graceAt = shiftStart.getTime() + shift.grace_minutes * 60_000;

  if (!record) {
    if (date === today && now.getTime() <= graceAt) return "future";
    if (date === today && now.getTime() <= shiftEnd.getTime()) return "in_progress";
    if (now.getTime() <= graceAt) return "future";
    return "missing_checkin";
  }

  if (!record.check_out_at) {
    if (date === today && now.getTime() <= shiftEnd.getTime()) return "in_progress";
    return "missing_checkout";
  }

  return record.is_late ? "late" : "complete";
}

function groupStateForDate(
  date: string,
  today: string,
  now: Date,
  shift: ShiftRow | null,
): DailyRosterGroupState {
  if (!shift) return "unassigned";
  if (date > today) return "upcoming";
  if (date < today) return "closed";
  const startAt = getShiftStartUtc(date, shift);
  const graceAt = new Date(startAt.getTime() + shift.grace_minutes * 60_000);
  if (now.getTime() < startAt.getTime()) return "upcoming";
  if (now.getTime() <= graceAt.getTime()) return "grace";
  return "closed";
}

function groupStateLabel(state: DailyRosterGroupState): string {
  if (state === "upcoming") return "ยังไม่ถึงเวลา";
  if (state === "grace") return "รอครบเวลา grace";
  if (state === "unassigned") return "ยังไม่กำหนดกะ";
  return "เลยเวลาแล้ว";
}

function employeeStatusLabel(status: DailyRosterEmployeeStatus): string {
  if (status === "present") return "มาแล้ว";
  if (status === "late") return "มาสาย";
  if (status === "on_leave") return "ลา";
  if (status === "off") return "วันหยุด";
  if (status === "pending") return "รอก่อนครบ grace";
  if (status === "upcoming") return "ยังไม่ถึงเวลา";
  if (status === "unassigned") return "ไม่มีกะ";
  return "ขาด";
}

function employeeStatusFromDayStatus(
  dayStatus: ReturnType<typeof deriveDayStatus>,
  shiftState: DailyRosterGroupState,
  record: AttendanceRow | null,
): DailyRosterEmployeeStatus {
  if (dayStatus === "on_leave") return "on_leave";
  if (!record && dayStatus === "in_progress" && shiftState === "closed") return "absent";
  if (dayStatus === "late") return "late";
  if (
    dayStatus === "complete" ||
    dayStatus === "in_progress" ||
    dayStatus === "missing_checkout"
  ) {
    return record?.is_late ? "late" : "present";
  }
  if (dayStatus === "future") {
    return shiftState === "grace" ? "pending" : "upcoming";
  }
  if (dayStatus === "missing_checkin") return "absent";
  return "unassigned";
}

function buildEmployeeNote(
  status: DailyRosterEmployeeStatus,
  record: AttendanceRow | null,
  shiftState: DailyRosterGroupState,
): string {
  if (record?.check_in_at) {
    const inText = ictTimeText(new Date(record.check_in_at));
    const outText = record.check_out_at
      ? ictTimeText(new Date(record.check_out_at))
      : "ยังไม่เช็คเอาท์";
    return `เข้า ${inText}${record.check_out_at ? ` • ออก ${outText}` : ` • ${outText}`}`;
  }
  if (status === "on_leave") return "อนุมัติลาแล้ว";
  if (status === "off") return "วันหยุดประจำสัปดาห์";
  if (status === "pending") return "พ้นเวลาเข้างานแล้ว แต่ยังอยู่ในช่วง grace";
  if (status === "upcoming") return "ยังไม่ถึงเวลาเริ่มกะ";
  if (shiftState === "unassigned") return "ยังไม่ได้กำหนด work shift";
  return "ยังไม่มีการเช็คอิน";
}

function buildRosterWorkTimeText(
  employee: Pick<
    EmployeeRow,
    "default_check_in_time" | "default_check_out_time" | "employee_code" | "id"
  >,
  shift: ShiftRow | null,
  record: AttendanceRow | null,
): string {
  if (record?.check_in_at) {
    const inText = ictTimeText(new Date(record.check_in_at));
    const outText = record.check_out_at
      ? ictTimeText(new Date(record.check_out_at))
      : "—";
    return `${inText} – ${outText}`;
  }
  return formatEmployeeWorkTimeText({
    default_check_in_time: employee.default_check_in_time,
    default_check_out_time: employee.default_check_out_time,
    workShift: shift,
  });
}

function pushCount(
  totals: DailyRoster["totals"] | DailyRosterGroup["totals"],
  status: DailyRosterEmployeeStatus,
) {
  totals.total += 1;
  if (status === "present" || status === "late") totals.checkedIn += 1;
  if (status === "late") totals.late += 1;
  if (status === "on_leave") totals.onLeave += 1;
  if (status === "absent") totals.absent += 1;
  if (status === "pending") totals.pending += 1;
}

export function formatNameList(
  employees: DailyRosterEmployee[],
  limit = 12,
): string {
  if (employees.length === 0) return "-";
  const names = employees.slice(0, limit).map((employee) => employee.name).join(", ");
  const remainder = employees.length - limit;
  return remainder > 0 ? `${names} และอีก ${remainder} คน` : names;
}

export async function buildDailyRoster(
  admin: AdminClient,
  filters: { date: string; now?: Date },
): Promise<DailyRoster> {
  const now = filters.now ?? new Date();
  const today = ictDateString(now);
  const { start, end } = ictDayRange(filters.date);

  const [{ data: employees, error: employeeError }, { data: config, error: configError }] =
    await Promise.all([
      admin
        .from("hr_employees")
        .select("id, employee_code, name, position, department, branch_id, work_shift_id, default_check_in_time, default_check_out_time, hr_branches!hr_employees_branch_id_fkey(name)")
        .eq("status", "active")
        .order("name"),
      admin
        .from("hr_runtime_config")
        .select("value")
        .eq("key", "attendance_go_live_date")
        .maybeSingle(),
    ]);

  if (employeeError) throw employeeError;
  if (configError) throw configError;

  const employeeRows = (employees ?? []) as EmployeeRow[];
  const employeeIds = employeeRows.map((employee) => employee.id);
  const shiftIds = [
    ...new Set(
      employeeRows
        .map((employee) => employee.work_shift_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [{ data: shifts, error: shiftError }, { data: attendance, error: attendanceError }, {
    data: leaves,
    error: leaveError,
  }] = await Promise.all([
    shiftIds.length > 0
      ? admin
        .from("hr_work_shifts")
        .select(
          "id, code, name, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes, standard_hours, is_active",
        )
        .eq("is_active", true)
        .in("id", shiftIds)
      : Promise.resolve({ data: [], error: null }),
    employeeIds.length > 0
      ? admin
        .from("hr_attendance")
        .select("employee_id, check_in_at, check_out_at, is_late, shift_date")
        .in("employee_id", employeeIds)
        .gte("check_in_at", start.toISOString())
        .lt("check_in_at", end.toISOString())
      : Promise.resolve({ data: [], error: null }),
    employeeIds.length > 0
      ? admin
        .from("hr_leaves")
        .select("employee_id")
        .in("employee_id", employeeIds)
        .eq("status", "approved")
        .lte("start_date", filters.date)
        .gte("end_date", filters.date)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (shiftError) throw shiftError;
  if (attendanceError) throw attendanceError;
  if (leaveError) throw leaveError;

  const shiftById = new Map(
    ((shifts ?? []) as ShiftRow[]).map((shift) => [shift.id, shift]),
  );
  const attendanceByEmployee = new Map<string, AttendanceRow>();
  for (const row of (attendance ?? []) as AttendanceRow[]) {
    const date = row.shift_date ?? ictDateString(new Date(row.check_in_at));
    if (date !== filters.date) continue;
    const existing = attendanceByEmployee.get(row.employee_id);
    if (!existing || row.check_in_at < existing.check_in_at) {
      attendanceByEmployee.set(row.employee_id, row);
    }
  }

  const leaveSet = new Set((leaves ?? []).map((row) => row.employee_id as string));
  const groups = new Map<string, DailyRosterGroup>();
  const rosterTotals: DailyRoster["totals"] = {
    total: 0,
    checkedIn: 0,
    late: 0,
    onLeave: 0,
    absent: 0,
    pending: 0,
  };

  function ensureGroup(shiftId: string | null): DailyRosterGroup {
    const key = shiftId ?? UNASSIGNED_SHIFT_ID;
    const existing = groups.get(key);
    if (existing) return existing;

    const shift = shiftId ? (shiftById.get(shiftId) ?? null) : null;
    const state = groupStateForDate(filters.date, today, now, shift);
    const startAt = shift ? getShiftStartUtc(filters.date, shift) : null;
    const graceAt = startAt
      ? new Date(startAt.getTime() + shift!.grace_minutes * 60_000)
      : null;

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
    };
    groups.set(key, group);
    return group;
  }

  for (const employee of employeeRows) {
    const group = ensureGroup(employee.work_shift_id);
    const shift = employee.work_shift_id
      ? (shiftById.get(employee.work_shift_id) ?? null)
      : null;
    const record = attendanceByEmployee.get(employee.id) ?? null;
    const effectiveIsLate = record
      ? effectiveAttendanceIsLate(
          record.check_in_at,
          shift,
          record.is_late,
          employee.default_check_in_time,
        )
      : false;
    const effectiveRecord = record
      ? { ...record, is_late: effectiveIsLate }
      : null;
    const onLeave = leaveSet.has(employee.id);
    const status = employeeStatusFromDayStatus(
      deriveDayStatus(
        filters.date,
        today,
        now,
        shift,
        onLeave,
        effectiveRecord,
        (config?.value as string | null) ?? null,
      ),
      group.state,
      effectiveRecord,
    );
    const rosterEmployee: DailyRosterEmployee = {
      id: employee.id,
      employeeCode: formatEmployeeCode(employee),
      name: employee.name,
      position: employee.position,
      department: employee.department,
      branchName: branchNameFromJoin(employee.hr_branches),
      status,
      statusLabel: employeeStatusLabel(status),
      note: buildEmployeeNote(status, effectiveRecord, group.state),
      workTimeText: buildRosterWorkTimeText(employee, shift, effectiveRecord),
      checkedInAt: record?.check_in_at ?? null,
      checkedOutAt: record?.check_out_at ?? null,
      isLate: effectiveIsLate,
    };

    group.employees.push(rosterEmployee);
    pushCount(group.totals, status);
    pushCount(rosterTotals, status);
  }

  const sortedGroups = [...groups.values()].sort((left, right) => {
    if (left.id === UNASSIGNED_SHIFT_ID) return 1;
    if (right.id === UNASSIGNED_SHIFT_ID) return -1;
    if (left.startAt && right.startAt) return left.startAt.localeCompare(right.startAt);
    return left.name.localeCompare(right.name);
  });
  for (const group of sortedGroups) {
    group.employees.sort((left, right) => left.name.localeCompare(right.name, "th"));
  }

  return {
    date: filters.date,
    today,
    goLiveDate: (config?.value as string | null) ?? null,
    nextShiftId:
      sortedGroups.find((group) => group.state === "grace" || group.state === "upcoming")?.id ??
      null,
    totals: rosterTotals,
    groups: sortedGroups,
  };
}
