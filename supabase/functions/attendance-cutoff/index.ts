import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, type WithSupabaseConfig } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SLA_HOURS = 48;

type AttendanceCutoffShift = {
  id: string;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  crosses_midnight: boolean;
  grace_minutes: number;
};

type AttendanceCutoffRow = {
  id: string;
  employee_id: string;
  check_in_at: string;
  shift_date: string | null;
  work_shift_id: string | null;
  location_review_status: string | null;
};

type EmployeeRow = {
  id: string;
  branch_id: string | null;
  default_check_in_time: string | null;
  default_check_out_time: string | null;
};

type SubmissionRow = {
  id: string;
  attendance_id: string;
  approval_status: string;
};

type PeriodCacheKey = string;

type PayrollLineSource = {
  period_id: string;
  employee_id: string;
  line_type: "regular" | "overtime" | "sick_hourly";
  hours: number;
  work_date: string;
  source_type: string;
  source_id: string;
};

type PaidWorkShiftWindow = {
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  crosses_midnight: boolean;
  grace_minutes?: number;
};

type PaidWorkMinutesResult = {
  rawMinutes: number;
  paidMinutes: number;
  paidHours: number;
};

function cronSecretAuthConfig(): WithSupabaseConfig {
  const cronSecretKey =
    Deno.env.get("CRON_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return cronSecretKey
    ? { auth: ["secret"], env: { secretKeys: { default: cronSecretKey } } }
    : { auth: ["secret"] };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function ictDateFromUtc(date: Date): string {
  return new Date(date.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function normalizeTimeToHHMM(time: string | null | undefined): string | null {
  if (!time) return null;
  const trimmed = time.trim();
  if (!trimmed) return null;

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/u.exec(trimmed);
  if (!match) return null;

  const hour = Number.parseInt(match[1], 10);
  const minute = match[2];
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;

  return `${pad2(hour)}:${minute}`;
}

function ictLocalToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - ICT_OFFSET_MS);
}

function getShiftEndUtc(workDate: string, shift: PaidWorkShiftWindow): Date {
  const [year, month, day] = workDate.split("-").map(Number);
  const endOffset = shift.crosses_midnight ? 1 : 0;
  return new Date(
    Date.UTC(year, month - 1, day + endOffset, shift.end_hour, shift.end_minute, 0, 0) -
      ICT_OFFSET_MS,
  );
}

function computeOverlap(
  actualIn: Date,
  actualOut: Date,
  windowStart: Date,
  windowEnd: Date,
  graceMinutes: number,
) {
  const graceMs = Math.max(0, graceMinutes) * 60_000;
  const effectiveIn =
    actualIn.getTime() > windowStart.getTime() &&
      actualIn.getTime() <= windowStart.getTime() + graceMs
      ? windowStart
      : actualIn;
  const overlapMs = Math.max(
    0,
    Math.min(actualOut.getTime(), windowEnd.getTime()) -
      Math.max(effectiveIn.getTime(), windowStart.getTime()),
  );
  return overlapMs;
}

function computePaidWorkMinutes({
  workDate,
  shift,
  checkInAt,
  checkOutAt,
  defaultCheckInTime,
  defaultCheckOutTime,
}: {
  workDate: string;
  shift: PaidWorkShiftWindow | null;
  checkInAt: Date;
  checkOutAt: Date;
  defaultCheckInTime?: string | null;
  defaultCheckOutTime?: string | null;
}): PaidWorkMinutesResult {
  const rawMinutes = Math.max(
    0,
    Math.floor((checkOutAt.getTime() - checkInAt.getTime()) / 60_000),
  );

  if (shift) {
    const windowStart = ictLocalToUtc(workDate, `${pad2(shift.start_hour)}:${pad2(shift.start_minute)}`);
    let windowEnd = ictLocalToUtc(workDate, `${pad2(shift.end_hour)}:${pad2(shift.end_minute)}`);
    if (shift.crosses_midnight || windowEnd.getTime() <= windowStart.getTime()) {
      windowEnd = new Date(windowEnd.getTime() + DAY_MS);
    }

    const paidMinutes = Math.floor(
      computeOverlap(
        checkInAt,
        checkOutAt,
        windowStart,
        windowEnd,
        shift.grace_minutes ?? 0,
      ) / 60_000,
    );
    return {
      rawMinutes,
      paidMinutes,
      paidHours: Math.round((paidMinutes / 60) * 100) / 100,
    };
  }

  const inTime = normalizeTimeToHHMM(defaultCheckInTime);
  const outTime = normalizeTimeToHHMM(defaultCheckOutTime);
  if (inTime && outTime) {
    const windowStart = ictLocalToUtc(workDate, inTime);
    let windowEnd = ictLocalToUtc(workDate, outTime);
    if (windowEnd.getTime() <= windowStart.getTime()) {
      windowEnd = new Date(windowEnd.getTime() + DAY_MS);
    }
    const paidMinutes = Math.floor(
      computeOverlap(checkInAt, checkOutAt, windowStart, windowEnd, 0) / 60_000,
    );
    return {
      rawMinutes,
      paidMinutes,
      paidHours: Math.round((paidMinutes / 60) * 100) / 100,
    };
  }

  return {
    rawMinutes,
    paidMinutes: rawMinutes,
    paidHours: Math.round((rawMinutes / 60) * 100) / 100,
  };
}

function expiresAtFrom(timestamp: Date): Date {
  return new Date(timestamp.getTime() + SLA_HOURS * 60 * 60 * 1000);
}

function buildAttendanceWorkDate(row: AttendanceCutoffRow): string {
  return row.shift_date ?? ictDateFromUtc(new Date(row.check_in_at));
}

function resolveCutoffCheckoutAt(
  checkInAt: Date,
  workDate: string,
  shift: AttendanceCutoffShift | null,
  employee: EmployeeRow,
  now: Date,
): Date {
  if (shift) {
    return getShiftEndUtc(workDate, shift);
  }

  const defaultOut = normalizeTimeToHHMM(employee.default_check_out_time);
  const defaultIn = normalizeTimeToHHMM(employee.default_check_in_time);
  if (defaultIn && defaultOut) {
    let fallbackOut = ictLocalToUtc(workDate, defaultOut);
    const fallbackIn = ictLocalToUtc(workDate, defaultIn);
    if (fallbackOut.getTime() <= fallbackIn.getTime()) {
      fallbackOut = new Date(fallbackOut.getTime() + DAY_MS);
    }
    if (fallbackOut.getTime() > checkInAt.getTime() && fallbackOut.getTime() <= now.getTime()) {
      return fallbackOut;
    }
  }

  return now;
}

function ensurePeriodIdByDate(
  periodCache: Map<PeriodCacheKey, string>,
  admin: any,
  workDate: string,
  branchId: string | null,
) {
  const key: PeriodCacheKey = `${workDate}|${branchId ?? "null"}`;
  const cached = periodCache.get(key);
  if (cached) return Promise.resolve(cached);

  const [year, month] = workDate.split("-").map(Number);
  return admin
    .from("hr_payroll_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .eq("branch_id", branchId)
    .maybeSingle()
    .then(async ({ data: existing, error }: { data: { id: string } | null; error: Error | null }) => {
      if (error) throw error;
      if (existing?.id) {
        periodCache.set(key, existing.id);
        return existing.id as string;
      }

      const { data: created, error: insertError } = await admin
        .from("hr_payroll_periods")
        .insert({ year, month, branch_id: branchId })
        .select("id")
        .single();
      if (insertError) throw insertError;
      periodCache.set(key, created.id as string);
      return created.id as string;
    });
}

const handler = {
  fetch: withSupabase(cronSecretAuthConfig(), async (_req, ctx) => {
    try {
      const now = new Date();
      const admin = ctx.supabaseAdmin;

      const { data: openRows, error } = await admin
        .from("hr_attendance")
        .select("id, employee_id, check_in_at, shift_date, work_shift_id, location_review_status")
        .is("check_out_at", null);

      if (error) throw error;
      const rows = (openRows ?? []) as AttendanceCutoffRow[];
      if (rows.length === 0) {
        return Response.json({ checkedOut: 0, skipped: 0, pendingReview: 0 });
      }

      const employeeIds = [...new Set(rows.map((row) => row.employee_id))];
      const shiftIds = [
        ...new Set(rows.map((row) => row.work_shift_id).filter(Boolean) as string[]),
      ];

      const [{ data: employees, error: employeeError }, { data: shifts, error: shiftError }] =
        await Promise.all([
          admin
            .from("hr_employees")
            .select("id, branch_id, default_check_in_time, default_check_out_time")
            .in("id", employeeIds),
          shiftIds.length > 0
            ? admin
              .from("hr_work_shifts")
              .select(
                "id, start_hour, start_minute, end_hour, end_minute, crosses_midnight, grace_minutes",
              )
              .in("id", shiftIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (employeeError) throw employeeError;
      if (shiftError) throw shiftError;

      const employeeById = new Map<string, EmployeeRow>(
        (employees ?? []).map((row: EmployeeRow) => [row.id, row]),
      );
      const shiftById = new Map<string, AttendanceCutoffShift>(
        (shifts ?? []).map((row: AttendanceCutoffShift) => [row.id, row]),
      );
      const openAttendanceIds = rows.map((row) => row.id);

      const { data: existingSubmissions, error: existingSubmissionError } = await admin
        .from("hr_attendance_submissions")
        .select("id, attendance_id, approval_status")
        .in("attendance_id", openAttendanceIds);

      if (existingSubmissionError) throw existingSubmissionError;

      const submissionByAttendanceId = new Map<string, SubmissionRow>();
      for (const row of (existingSubmissions ?? []) as SubmissionRow[]) {
        submissionByAttendanceId.set(row.attendance_id, row);
      }

      const periodCache = new Map<PeriodCacheKey, string>();

      let checkedOut = 0;
      let skipped = 0;
      let pendingReview = 0;
      let payrollLines = 0;

      for (const row of rows) {
        const employee = employeeById.get(row.employee_id);
        if (!employee) {
          skipped += 1;
          continue;
        }

        const shift = row.work_shift_id ? shiftById.get(row.work_shift_id) ?? null : null;
        const checkInAt = new Date(row.check_in_at);
        if (Number.isNaN(checkInAt.getTime())) {
          skipped += 1;
          continue;
        }
        const workDate = buildAttendanceWorkDate(row);
        const checkoutAt = resolveCutoffCheckoutAt(checkInAt, workDate, shift, employee, now);
        if (checkoutAt.getTime() > now.getTime()) {
          skipped += 1;
          continue;
        }

        const result = computePaidWorkMinutes({
          workDate,
          shift,
          checkInAt,
          checkOutAt: checkoutAt,
          defaultCheckInTime: employee.default_check_in_time,
          defaultCheckOutTime: employee.default_check_out_time,
        });

        const { data: updatedRows, error: updateError } = await admin
          .from("hr_attendance")
          .update({
            check_out_at: checkoutAt.toISOString(),
            work_hours: result.paidHours,
          })
          .eq("id", row.id)
          .is("check_out_at", null)
          .select("id");

        if (updateError) {
          throw updateError;
        }

        if (!updatedRows || updatedRows.length === 0) {
          skipped += 1;
          continue;
        }
        checkedOut += 1;

        const reviewStatus = row.location_review_status ?? "clear";
        if (["pending_hr", "rejected"].includes(reviewStatus)) {
          pendingReview += 1;
          continue;
        }

        const existingSubmission = submissionByAttendanceId.get(row.id);
        if (existingSubmission?.approval_status === "approved") {
          continue;
        }

        const expiredAt = expiresAtFrom(now);
        const { data: submitted, error: submissionUpsertError } = await admin
          .from("hr_attendance_submissions")
          .upsert(
            {
              attendance_id: row.id,
              employee_id: row.employee_id,
              work_date: workDate,
              submitted_at: now.toISOString(),
              expires_at: expiredAt.toISOString(),
              approval_status: "approved",
              manager_decided_by: null,
              manager_decided_at: null,
              hr_decided_by: null,
              hr_decided_at: now.toISOString(),
              decision_note: null,
            },
            { onConflict: "attendance_id" },
          )
          .select("id")
          .single();

        if (submissionUpsertError) throw submissionUpsertError;

        if (result.paidHours > 0 && submitted?.id) {
          const periodId = await ensurePeriodIdByDate(periodCache, admin, workDate, employee.branch_id);
          const payrollLine: PayrollLineSource = {
            period_id: periodId,
            employee_id: row.employee_id,
            line_type: "regular",
            hours: result.paidHours,
            work_date: workDate,
            source_type: "attendance",
            source_id: submitted.id as string,
          };
          const { error: payrollError } = await admin
            .from("hr_payroll_hour_lines")
            .upsert(payrollLine, { onConflict: "source_type,source_id" });
          if (payrollError) throw payrollError;
          payrollLines += 1;
        }
      }

      return Response.json({
        checkedOut,
        skipped,
        pendingReview,
        payrollLines,
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error);
      console.error("attendance-cutoff failed:", message);
      return Response.json({ error: message }, { status: 500 });
    }
  }),
};

export default handler;
