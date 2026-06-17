/** Probation reminders apply only while HR has not closed the probation cycle. */
export function probationNeedsComplianceAlert(params: {
  probationEnd: string | null
  probationOutcome: string | null
}): boolean {
  const { probationEnd, probationOutcome } = params
  if (!probationEnd) return false
  if (probationOutcome === "passed" || probationOutcome === "failed") return false
  return true
}
