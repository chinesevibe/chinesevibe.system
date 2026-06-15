import type { ComplaintThreadEntry } from "@/features/complaints/thread"
import { getAdminClient } from "@/lib/auth/admin-client"
import { coerceLocale } from "@/lib/i18n/types"
import { complaintReplyFlex } from "@/lib/line/flex/complaint-submit"
import { pushToLineUser } from "@/lib/line/notify-hr"

export type ComplaintLineNotifyResult =
  | { sent: true }
  | { sent: false; reason: "anonymous" | "no_employee" | "no_line_user" | "line_error" }

/** Push complaint HR reply to employee LINE — best-effort, never throws. */
export async function notifyComplaintReplyToEmployee(options: {
  employeeId: string | null
  isAnonymous: boolean
  ticketCode: string
  subject: string
  message: string
  closed: boolean
  thread: ComplaintThreadEntry[]
}): Promise<ComplaintLineNotifyResult> {
  if (options.isAnonymous) {
    return { sent: false, reason: "anonymous" }
  }
  if (!options.employeeId) {
    return { sent: false, reason: "no_employee" }
  }

  const admin = getAdminClient()
  const { data: emp, error } = await admin
    .from("hr_employees")
    .select("line_user_id, preferred_locale")
    .eq("id", options.employeeId)
    .maybeSingle()

  if (error) {
    console.error("notifyComplaintReplyToEmployee lookup failed:", error)
    return { sent: false, reason: "line_error" }
  }

  const lineUserId = emp?.line_user_id
  if (!lineUserId) {
    return { sent: false, reason: "no_line_user" }
  }

  const locale = coerceLocale(emp?.preferred_locale)

  try {
    await pushToLineUser(lineUserId, [
      complaintReplyFlex({
        ticketCode: options.ticketCode,
        subject: options.subject,
        message: options.message,
        closed: options.closed,
        thread: options.thread,
        locale,
      }),
    ])
    return { sent: true }
  } catch (lineError) {
    console.error("notifyComplaintReplyToEmployee push failed:", lineError)
    return { sent: false, reason: "line_error" }
  }
}
