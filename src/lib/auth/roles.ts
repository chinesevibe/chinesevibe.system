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

/** อนุมัติลา / OT / เข้างาน — HR Officer (role hr) เท่านั้น */
export function canApproveHrRequests(role: AppRole): boolean {
  return isHrOfficer(role)
}

export function isHrAdmin(role: AppRole): boolean {
  return role === "hr" || role === "admin"
}

export function isBranchManager(role: AppRole): boolean {
  return role === "branch_manager"
}

export function canAccessAdminPortal(role: AppRole): boolean {
  return isHrAdmin(role) || isCeo(role) || isBranchManager(role) || isDev(role)
}

/** Inventory dept — restricted admin portal (คลังสินค้า only) */
export function isInventoryPortalUser(employee: Employee): boolean {
  if (employee.status !== "active") return false
  if (isDev(employee.role) || isCeo(employee.role)) return false
  if (isBranchManager(employee.role)) return false

  // Inventory Manager — operational inventory portal (incl. legacy admin role)
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

/** Inventory portal + HR/CEO/Dev full inventory access */
export function canAccessInventoryPortal(employee: Employee): boolean {
  if (isDev(employee.role) || isCeo(employee.role) || canManageHr(employee.role)) {
    return true
  }
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

/** Worker web portal — active employees + dev (for QA). */
export function canAccessEmployeePortal(role: AppRole): boolean {
  return role === "employee" || isDev(role)
}

export function canManageHr(role: AppRole): boolean {
  return isHrAdmin(role) || isDev(role)
}

/** Dev + HR Admin — เข้าถึงข้อมูลและจัดการได้ทั้งหมด */
export function hasFullDataAccess(role: AppRole): boolean {
  return isDev(role) || canManageHr(role)
}

/** Edit employee records (profile, lifecycle) — HR, Dev, CEO */
export function canEditEmployeeRecord(role: AppRole): boolean {
  return canManageHr(role) || isCeo(role)
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
