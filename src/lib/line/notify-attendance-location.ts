import { getAdminClient } from "@/lib/auth/admin-client"
import { EMPLOYEE_VIA_ATTENDANCE } from "@/lib/supabase/employee-embeds"
import { attendanceLocationReviewFlex } from "@/lib/line/flex/attendance-location-review"
import { notifyHr } from "@/lib/line/notify-hr"

/** Best-effort HR notify when attendance location needs review */
export async function notifyAttendanceLocationReview(
  attendanceId: string
): Promise<void> {
  try {
    const admin = getAdminClient()
    const { data, error } = await admin
      .from("hr_attendance")
      .select(
        `id, check_in_at, location_review_flags, ${EMPLOYEE_VIA_ATTENDANCE}!inner(name, department)`
      )
      .eq("id", attendanceId)
      .maybeSingle()

    if (error || !data) {
      console.error("notifyAttendanceLocationReview: not found", error)
      return
    }

    type Emp = { name: string; department: string | null }
    const empRaw = data.hr_employees as Emp | Emp[]
    const emp = Array.isArray(empRaw) ? empRaw[0] : empRaw

    const flex = attendanceLocationReviewFlex({
      attendanceId: data.id as string,
      employeeName: emp?.name ?? "—",
      department: emp?.department ?? null,
      checkInAt: data.check_in_at as string,
      flags: (data.location_review_flags as string[] | null) ?? [],
    })

    await notifyHr([
      {
        type: "text",
        text: `📍 พิกัดน่าสงสัย — ${emp?.name ?? "พนักงาน"} รอ HR ตรวจสอบ`,
      },
      flex,
    ])
  } catch (e) {
    console.error("notifyAttendanceLocationReview failed:", e)
  }
}
