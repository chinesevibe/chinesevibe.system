/** Round payroll hours to 2 decimals (avoids IEEE float display noise). */
export function roundPayrollHours(hours: number): number {
  return Math.round(hours * 100) / 100
}

/** Format payroll hours for display — always 2 decimal places. */
export function formatPayrollHours(hours: number): string {
  return roundPayrollHours(hours).toFixed(2)
}
