import {
  isHrOfficerStaff,
  isInventoryManagerStaff,
} from "@/lib/auth/department-access"
import type { AssignableRole } from "@/lib/auth/employee-roles"

/** แผนก Head Office — Role ที่แนะนำ + ค่าเริ่มต้น */
const HEAD_OFFICE_DEPARTMENT_ROLES: Record<
  string,
  { defaultRole: AssignableRole; allowed: readonly AssignableRole[] }
> = {
  Management: {
    defaultRole: "admin",
    allowed: ["ceo", "admin"],
  },
  "HR Officer": {
    defaultRole: "hr",
    allowed: ["hr"],
  },
  Officer: {
    defaultRole: "employee",
    allowed: ["employee", "hr"],
  },
  IT: {
    defaultRole: "dev",
    allowed: ["dev"],
  },
  Admin: {
    defaultRole: "admin",
    allowed: ["admin", "hr"],
  },
  Accounting: {
    defaultRole: "admin",
    allowed: ["admin", "employee"],
  },
  Inventory: {
    defaultRole: "admin",
    allowed: ["admin", "employee"],
  },
}

const BRANCH_DEFAULT: {
  defaultRole: AssignableRole
  allowed: readonly AssignableRole[]
} = {
  defaultRole: "employee",
  allowed: ["employee", "branch_manager"],
}

function configForDepartment(department: string | null | undefined) {
  if (!department?.trim()) return BRANCH_DEFAULT
  return HEAD_OFFICE_DEPARTMENT_ROLES[department.trim()] ?? BRANCH_DEFAULT
}

export function defaultRoleForDepartment(
  department: string | null | undefined,
  position?: string | null
): AssignableRole {
  if (isHrOfficerStaff(department, position)) return "hr"
  if (isInventoryManagerStaff(department, position)) return "employee"
  return configForDepartment(department).defaultRole
}

export function allowedRolesForDepartment(
  department: string | null | undefined,
  position?: string | null
): readonly AssignableRole[] {
  if (isHrOfficerStaff(department, position)) return ["hr"]
  if (isInventoryManagerStaff(department, position)) return ["employee"]
  return configForDepartment(department).allowed
}

/** ตรวจคู่แผนก–Role (ข้ามเมื่อผู้แก้เป็น dev) */
export function isRoleAllowedForDepartment(
  department: string | null | undefined,
  role: AssignableRole,
  options?: { skipValidation?: boolean; position?: string | null }
): boolean {
  if (options?.skipValidation) return true
  return allowedRolesForDepartment(department, options?.position).includes(role)
}

export function departmentRoleMismatchMessage(
  department: string | null | undefined,
  role: AssignableRole,
  position?: string | null
): string | null {
  if (isRoleAllowedForDepartment(department, role, { position })) return null
  const allowed = allowedRolesForDepartment(department, position)
    .map((r) => r)
    .join(", ")
  const positionHint = position?.trim() ? ` / ตำแหน่ง "${position}"` : ""
  return `Role "${role}" ไม่ตรงกับแผนก "${department ?? "—"}"${positionHint} — ใช้ได้: ${allowed}`
}
