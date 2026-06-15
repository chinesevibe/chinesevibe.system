// Marks pending attendance/leave submissions expired after 48h SLA (ICT)
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const handler = {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const admin = ctx.supabaseAdmin;
    const now = new Date().toISOString();

    const [att, leaves, overtime] = await Promise.all([
      admin
        .from("hr_attendance_submissions")
        .update({ approval_status: "expired" })
        .in("approval_status", ["pending_manager", "pending_hr"])
        .lt("expires_at", now)
        .select("id"),
      admin
        .from("hr_leaves")
        .update({ approval_status: "expired", status: "rejected" })
        .in("approval_status", ["pending_manager", "pending_hr"])
        .lt("expires_at", now)
        .select("id"),
      admin
        .from("hr_overtime_requests")
        .update({ approval_status: "expired", status: "rejected" })
        .in("approval_status", ["pending_manager", "pending_hr"])
        .lt("expires_at", now)
        .select("id"),
    ]);

    return Response.json({
      attendanceExpired: att.data?.length ?? 0,
      leavesExpired: leaves.data?.length ?? 0,
      overtimeExpired: overtime.data?.length ?? 0,
    });
  }),
};

export default handler;
