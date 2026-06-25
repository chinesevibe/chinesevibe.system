import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, type WithSupabaseConfig } from "@supabase/server";

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_CUTOFF_TIME = "06:00";
const MISSING_CHECKOUT_FLAG = "missing_checkout";

type AttendanceCutoffRow = {
  id: string;
  employee_id: string;
  check_in_at: string;
  shift_date: string | null;
  work_shift_id: string | null;
  location_review_flags: string[] | null;
  location_review_note: string | null;
};

type EmployeeRow = {
  id: string;
};

function cronSecretAuthConfig(): WithSupabaseConfig {
  const cronSecretKey =
    Deno.env.get("CRON_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return cronSecretKey
    ? { auth: ["secret"], env: { secretKeys: { default: cronSecretKey } } }
    : { auth: ["secret"] };
}

function ictDateFromUtc(date: Date): string {
  return new Date(date.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function ictLocalToUtc(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) - ICT_OFFSET_MS);
}

function hasMissingCheckoutFlag(flags: string[] | null | undefined): boolean {
  return Array.isArray(flags) && flags.includes(MISSING_CHECKOUT_FLAG);
}

function resolveCutoffCheckoutAt(
  checkInAt: Date,
): Date {
  const workDate = ictDateFromUtc(checkInAt);
  let cutoffAt = ictLocalToUtc(workDate, SESSION_CUTOFF_TIME);
  if (cutoffAt.getTime() <= checkInAt.getTime()) {
    cutoffAt = new Date(cutoffAt.getTime() + DAY_MS);
  }
  return cutoffAt;
}

const handler = {
  fetch: withSupabase(cronSecretAuthConfig(), async (_req, ctx) => {
    try {
      const now = new Date();
      const admin = ctx.supabaseAdmin;

      const { data: openRows, error } = await admin
        .from("hr_attendance")
        .select("id, employee_id, check_in_at, shift_date, work_shift_id, location_review_flags, location_review_note")
        .is("check_out_at", null);

      if (error) throw error;
      const rows = (openRows ?? []) as AttendanceCutoffRow[];
      if (rows.length === 0) {
        return Response.json({ checkedOut: 0, skipped: 0, pendingReview: 0 });
      }

      const employeeIds = [...new Set(rows.map((row) => row.employee_id))];
      const { data: employees, error: employeeError } = await admin
        .from("hr_employees")
        .select("id")
        .in("id", employeeIds);

      if (employeeError) throw employeeError;

      const employeeById = new Map<string, EmployeeRow>(
        (employees ?? []).map((row: EmployeeRow) => [row.id, row]),
      );
      let checkedOut = 0;
      let skipped = 0;

      for (const row of rows) {
        const employee = employeeById.get(row.employee_id);
        if (!employee) {
          skipped += 1;
          continue;
        }
        if (hasMissingCheckoutFlag(row.location_review_flags)) {
          skipped += 1;
          continue;
        }

        const checkInAt = new Date(row.check_in_at);
        if (Number.isNaN(checkInAt.getTime())) {
          skipped += 1;
          continue;
        }
        const checkoutAt = resolveCutoffCheckoutAt(checkInAt);
        if (checkoutAt.getTime() > now.getTime()) {
          skipped += 1;
          continue;
        }

        const nextFlags = Array.from(
          new Set([...(row.location_review_flags ?? []), MISSING_CHECKOUT_FLAG]),
        );
        const nextNote =
          row.location_review_note && row.location_review_note.trim().length > 0
            ? row.location_review_note
            : "Missing checkout after 06:00 cutoff";

        const { data: updatedRows, error: updateError } = await admin
          .from("hr_attendance")
          .update({
            location_review_flags: nextFlags,
            location_review_note: nextNote,
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
      }

      return Response.json({
        checkedOut,
        skipped,
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
