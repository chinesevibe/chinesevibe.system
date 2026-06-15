/** Head Office department — ทุกคนใช้ Dashboard ได้ (สิทธิ์ตาม Role) */
export const MANAGEMENT_DEPARTMENT_NAME = "Management"

/** แผนก HR Office — เข้า Admin Portal ได้เมื่อ active (legacy) */
export const HR_OFFICER_DEPARTMENT_NAME = "HR Officer"

/** แผนก Officer — HR staff เมื่อตำแหน่ง HR Officer */
export const OFFICER_DEPARTMENT_NAME = "Officer"

/** ตำแหน่ง HR Officer (ใช้คู่กับแผนก Officer) */
export const HR_OFFICER_POSITION_NAME = "HR Officer"

/** แผนกคลังสินค้า — เข้า Admin Portal แบบจำกัด (inventory only) */
export const INVENTORY_DEPARTMENT_NAME = "Inventory"

/** ตำแหน่ง Inventory Manager (ใช้คู่กับแผนก Inventory) */
export const INVENTORY_MANAGER_POSITION_NAME = "Inventory Manager"

export function isManagementDepartment(
  department: string | null | undefined
): boolean {
  if (!department) return false
  return department.trim().toLowerCase() === MANAGEMENT_DEPARTMENT_NAME.toLowerCase()
}

export function isHrOfficerDepartment(
  department: string | null | undefined
): boolean {
  if (!department) return false
  return (
    department.trim().toLowerCase() === HR_OFFICER_DEPARTMENT_NAME.toLowerCase()
  )
}

export function isInventoryDepartment(
  department: string | null | undefined
): boolean {
  if (!department) return false
  return (
    department.trim().toLowerCase() === INVENTORY_DEPARTMENT_NAME.toLowerCase()
  )
}

export function isInventoryManagerPosition(
  position: string | null | undefined
): boolean {
  if (!position) return false
  return (
    position.trim().toLowerCase() ===
    INVENTORY_MANAGER_POSITION_NAME.toLowerCase()
  )
}

/** แผนก Inventory + ตำแหน่ง Inventory Manager */
export function isInventoryManagerStaff(
  department: string | null | undefined,
  position?: string | null
): boolean {
  return isInventoryDepartment(department) && isInventoryManagerPosition(position)
}

export function isOfficerDepartment(
  department: string | null | undefined
): boolean {
  if (!department) return false
  return department.trim().toLowerCase() === OFFICER_DEPARTMENT_NAME.toLowerCase()
}

/** แผนก Officer / HR Officer — ต้องใส่รหัสผ่านเมื่อ login ด้วยรหัสพนักงาน */
export function requiresOfficerPortalPassword(
  department: string | null | undefined
): boolean {
  return isOfficerDepartment(department) || isHrOfficerDepartment(department)
}

export function isHrOfficerPosition(
  position: string | null | undefined
): boolean {
  if (!position) return false
  return position.trim().toLowerCase() === HR_OFFICER_POSITION_NAME.toLowerCase()
}

/** แผนก HR Officer (legacy) หรือ Officer + ตำแหน่ง HR Officer */
export function isHrOfficerStaff(
  department: string | null | undefined,
  position?: string | null
): boolean {
  if (isHrOfficerDepartment(department)) return true
  return isOfficerDepartment(department) && isHrOfficerPosition(position)
}

export function isHeadOfficeAdminDepartment(
  department: string | null | undefined,
  position?: string | null
): boolean {
  return (
    isManagementDepartment(department) ||
    isHrOfficerStaff(department, position) ||
    isInventoryDepartment(department) ||
    isInventoryManagerStaff(department, position)
  )
}
