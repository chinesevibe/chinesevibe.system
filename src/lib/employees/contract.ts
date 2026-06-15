export const EMPLOYEE_CONTRACT_BUCKET = "hr-contracts"
export const EMPLOYEE_CONTRACT_MAX_BYTES = 5 * 1024 * 1024
export const EMPLOYEE_CONTRACT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const

export function sanitizeContractFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "contract"
}

export function isAllowedEmployeeContract(file: File): boolean {
  return (
    EMPLOYEE_CONTRACT_TYPES.includes(
      file.type as (typeof EMPLOYEE_CONTRACT_TYPES)[number]
    ) &&
    file.size > 0 &&
    file.size <= EMPLOYEE_CONTRACT_MAX_BYTES
  )
}
