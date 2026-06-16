export const RICH_MENU_ACTIONS = [
  "checkin",
  "checkin_in",
  "checkout",
  "checkout_confirm",
  "submit_attendance",
  "leave",
  "overtime",
  "document",
  "complaint",
  "inventory",
  "check_stock",
  "announcement",
  "contact_hr",
  "contact_hr_notify",
  "welcome",
] as const

export type RichMenuPostbackAction = (typeof RICH_MENU_ACTIONS)[number]

export const REGISTRATION_POSTBACK_ACTIONS = [
  "approve_registration",
  "reject_registration",
] as const

export type RegistrationPostbackAction =
  (typeof REGISTRATION_POSTBACK_ACTIONS)[number]

export const APPROVAL_POSTBACK_ACTIONS = [
  "approve_leave",
  "reject_leave",
  "approve_ot",
  "reject_ot",
  "approve_document",
  "reject_document",
  "hold_document",
  "approve_attendance",
  "reject_attendance",
  "complaint_reply",
  "complaint_close",
  "pending_queue",
] as const

export type ApprovalPostbackAction = (typeof APPROVAL_POSTBACK_ACTIONS)[number]

const UUID_RE = /^[0-9a-f-]{36}$/i

export function parsePostbackAction(
  data: string
): RichMenuPostbackAction | null {
  const action = new URLSearchParams(data).get("action")
  if (
    action !== null &&
    (RICH_MENU_ACTIONS as readonly string[]).includes(action)
  ) {
    return action as RichMenuPostbackAction
  }
  return null
}

export function parseRegistrationPostback(data: string): {
  action: RegistrationPostbackAction
  employeeId: string
} | null {
  const params = new URLSearchParams(data)
  const action = params.get("action")
  const employeeId = params.get("emp_id")?.trim()
  if (
    action !== null &&
    (REGISTRATION_POSTBACK_ACTIONS as readonly string[]).includes(action) &&
    employeeId &&
    UUID_RE.test(employeeId)
  ) {
    return { action: action as RegistrationPostbackAction, employeeId }
  }
  return null
}

export type ParsedApprovalPostback =
  | { action: "approve_leave" | "reject_leave"; leaveId: string }
  | { action: "approve_ot" | "reject_ot"; otId: string }
  | { action: "approve_document" | "reject_document" | "hold_document"; docId: string }
  | { action: "approve_attendance" | "reject_attendance"; attendanceId: string }
  | { action: "complaint_reply" | "complaint_close"; complaintId: string }
  | { action: "pending_queue" }

function readUuidParam(params: URLSearchParams, key: string): string | null {
  const value = params.get(key)?.trim()
  return value && UUID_RE.test(value) ? value : null
}

export function parseApprovalPostback(data: string): ParsedApprovalPostback | null {
  const params = new URLSearchParams(data)
  const action = params.get("action")
  if (!action || !(APPROVAL_POSTBACK_ACTIONS as readonly string[]).includes(action)) {
    return null
  }

  if (action === "pending_queue") {
    return { action: "pending_queue" }
  }

  if (action === "approve_leave" || action === "reject_leave") {
    const leaveId = readUuidParam(params, "leave_id")
    return leaveId ? { action, leaveId } : null
  }

  if (action === "approve_ot" || action === "reject_ot") {
    const otId = readUuidParam(params, "ot_id")
    return otId ? { action, otId } : null
  }

  if (
    action === "approve_document" ||
    action === "reject_document" ||
    action === "hold_document"
  ) {
    const docId = readUuidParam(params, "doc_id")
    return docId ? { action, docId } : null
  }

  if (action === "approve_attendance" || action === "reject_attendance") {
    const attendanceId = readUuidParam(params, "attendance_id")
    return attendanceId ? { action, attendanceId } : null
  }

  if (action === "complaint_reply" || action === "complaint_close") {
    const complaintId = readUuidParam(params, "complaint_id")
    return complaintId ? { action, complaintId } : null
  }

  return null
}
