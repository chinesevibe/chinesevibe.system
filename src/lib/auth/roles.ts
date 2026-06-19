import {
  isManagementDepartment,
  isHrOfficerStaff,
  isInventoryDepartment,
  isInventoryManagerStaff,
} from "@/lib/auth/department-access"
import {
  EMPLOYEE_INFO_PATH,
  PENDING_REGISTRATION_PATH,
} from "@/lib/auth/employee-access"
import type { Employee } from "@/lib/auth/session"

export type AppRole = Employee["role"]

export function isDev(role: AppRole): boolean {
  return role === "dev"
}

export function isCeo(role: AppRole): boolean {
  return role === "ceo"
}

export function isHrOfficer(role: AppRole): boolean {
  return role === "hr"
}

export function isInventoryRole(role: AppRole): boolean {
  return role === "inventory"
}

/** อนุมัติลา / OT / เข้างาน — HR Officer (role hr) เท่านั้น */
export function canApproveHrRequests(role: AppRole): boolean {
  return isHrOfficer(role)
}

export function isHrAdmin(role: AppRole): boolean {
  return role === "hr"
}

export function isBranchManager(role: AppRole): boolean {
  return role === "branch_manager"
}

export function canAccessAdminPortal(role: AppRole): boolean {
  return (
    isHrAdmin(role) ||
    isCeo(role) ||
    isBranchManager(role) ||
    isDev(role) ||
    isInventoryRole(role)
  )
}

/** พนักงานคลังทั่วไป — จำกัดเมนูคลังเท่านั้น (ไม่ใช่ Inventory Manager) */
export function isRestrictedInventoryPortalUser(employee: Employee): boolean {
  return (
    isInventoryPortalUser(employee) &&
    !isInventoryManagerStaff(employee.department, employee.position)
  )
}

/** Inventory dept — restricted admin portal (คลังสินค้า only) */
export function isInventoryPortalUser(employee: Employee): boolean {
  if (employee.status !== "active") return false
  if (isDev(employee.role) || isCeo(employee.role)) return false
  if (isBranchManager(employee.role)) return false
  if (isInventoryRole(employee.role)) return true

  if (isInventoryManagerStaff(employee.department, employee.position)) {
    return employee.role !== "hr"
  }

  if (!isInventoryDepartment(employee.department)) return false
  if (isHrAdmin(employee.role)) return false
  return true
}

/** Operational inventory staff (role employee in Inventory dept) */
export function isInventoryStaff(employee: Employee): boolean {
  return isInventoryPortalUser(employee) && employee.role === "employee"
}

/** HR inventory admin — aligns with public.hr_is_hr_admin() for app gates */
export function hasHrInventoryAccess(employee: Employee): boolean {
  if (canManageHr(employee.role)) return true
  return isHrOfficerStaff(employee.department, employee.position)
}

/** Inventory master data + ops (HR, inventory staff, dev) */
export function canManageInventory(employee: Employee): boolean {
  return (
    isDev(employee.role) ||
    hasHrInventoryAccess(employee) ||
    isInventoryRole(employee.role)
  )
}

/** Inventory portal + HR/CEO/Dev full inventory access */
export function canAccessInventoryPortal(employee: Employee): boolean {
  if (isDev(employee.role) || isCeo(employee.role) || hasHrInventoryAccess(employee)) {
    return true
  }
  if (isInventoryRole(employee.role)) return true
  return isInventoryPortalUser(employee)
}

/** Dashboard access — role-based; Head Office departments (active) เข้าได้ */
export function canEmployeeAccessAdminPortal(employee: Employee): boolean {
  if (employee.status !== "active") return false
  if (canAccessAdminPortal(employee.role)) return true
  return (
    isManagementDepartment(employee.department) ||
    isHrOfficerStaff(employee.department, employee.position) ||
    isInventoryDepartment(employee.department) ||
    isInventoryManagerStaff(employee.department, employee.position)
  )
}

/** แผนก Management + role Employee — full admin nav (no longer dashboard-only) */
export function isManagementDashboardEmployee(employee: Employee): boolean {
  return (
    employee.role === "employee" &&
    isManagementDepartment(employee.department)
  )
}

/** Worker web portal — active employees, inventory managers, dev (QA). */
export function canAccessEmployeePortal(
  employee: Pick<Employee, "role" | "department" | "position">
): boolean {
  if (isDev(employee.role)) return true
  if (employee.role === "employee") return true
  if (
    employee.role === "inventory" &&
    isInventoryManagerStaff(employee.department, employee.position)
  ) {
    return true
  }
  return false
}

export function canManageHr(role: AppRole): boolean {
  return isHrAdmin(role) || isDev(role)
}

/** Dev + HR — เข้าถึงข้อมูลและจัดการได้ทั้งหมด */
export function hasFullDataAccess(role: AppRole): boolean {
  return isDev(role) || canManageHr(role)
}

/** Edit employee records (profile, lifecycle) — HR, Dev, CEO */
export function canEditEmployeeRecord(role: AppRole): boolean {
  return canManageHr(role) || isCeo(role)
}

/** Salary, bank, pay type — HR, Dev, CEO only */
export function canViewSalaryData(role: AppRole): boolean {
  return canEditEmployeeRecord(role)
}

/** CEO — open all admin routes (no path prison) */
export function isCeoAllowedPath(pathname: string): boolean {
  return pathname.startsWith("/admin")
}

export function adminLoginPath(
  role: AppRole,
  status: Employee["status"] = "active",
  department: string | null = null,
  position: string | null = null
): string {
  if (status === "inactive") return PENDING_REGISTRATION_PATH
  if (role === "dev") return "/admin"
  if (role === "branch_manager") return "/admin/branch"
  if (role === "ceo") return "/admin/report"
  if (role === "inventory") return "/admin/inventory"
  if (role === "employee") {
    if (isHrOfficerStaff(department, position)) return "/admin"
    if (
      isInventoryDepartment(department) ||
      isInventoryManagerStaff(department, position)
    ) {
      return "/admin/inventory"
    }
    return "/portal"
  }
  if (
    isInventoryDepartment(department) ||
    isInventoryManagerStaff(department, position)
  ) {
    return "/admin/inventory"
  }
  if (
    isHrAdmin(role) ||
    isManagementDepartment(department) ||
    isHrOfficerStaff(department, position)
  ) {
    return "/admin"
  }
  return EMPLOYEE_INFO_PATH
}
