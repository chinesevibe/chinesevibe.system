/** Head Office branch — office staff; no store geofence for check-in/out. */
export const HEAD_OFFICE_BRANCH_CODE = "000"

export function isHeadOfficeBranchCode(
  code: string | null | undefined
): boolean {
  return code?.trim() === HEAD_OFFICE_BRANCH_CODE
}
