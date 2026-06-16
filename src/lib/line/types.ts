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
    /^[0-9a-f-]{36}$/i.test(employeeId)
  ) {
    return { action: action as RegistrationPostbackAction, employeeId }
  }
  return null
}
