/** Real LINE Messaging / Login user id (starts with U). */
export function isRealLineId(id: string | null | undefined): id is string {
  return typeof id === "string" && id.startsWith("U")
}

/** Placeholder id for portal / employee-code login without LINE OAuth. */
export function isPortalLineId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("portal_")
}

export function portalLineIdFor(employeeId: string): string {
  return `portal_${employeeId}`
}

export function canRelinkLineUserId(id: string | null | undefined): boolean {
  return !id || isPortalLineId(id)
}
