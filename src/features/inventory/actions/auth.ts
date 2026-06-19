import {
  canAccessInventoryPortal,
  hasHrInventoryAccess,
  isDev,
} from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"
import { ZodError } from "zod"

export async function assertInventoryAccess() {
  const employee = await getCurrentEmployee()
  if (!employee || !canAccessInventoryPortal(employee)) {
    throw new Error("ไม่มีสิทธิ์เข้าถึงคลังสินค้า")
  }
  return employee
}

/** Master data — SKU, Supplier, branches, warehouses (HR/Dev) */
export async function assertInventoryManage() {
  const employee = await getCurrentEmployee()
  if (!employee || (!hasHrInventoryAccess(employee) && !isDev(employee.role))) {
    throw new Error("ไม่มีสิทธิ์จัดการข้อมูลหลักคลังสินค้า")
  }
  return employee
}

/** Operational mutations — inbound, requisition approve/issue, etc. */
export async function assertInventoryOperate() {
  return assertInventoryAccess()
}

type SupabaseLikeError = {
  code?: string
  message: string
}

export function mapSupabaseInventoryError(error: SupabaseLikeError): string {
  if (error.code === "23505") {
    if (error.message.includes("inv_skus_code")) {
      return "รหัส SKU นี้มีในระบบแล้ว"
    }
    if (error.message.includes("inv_suppliers_code")) {
      return "รหัส Supplier นี้มีในระบบแล้ว"
    }
    if (error.message.includes("inv_branches_code")) {
      return "รหัสสาขา (คลัง) นี้มีในระบบแล้ว"
    }
    if (error.message.includes("inv_warehouses_code")) {
      return "รหัสคลังสินค้านี้มีในระบบแล้ว"
    }
    if (error.message.includes("barcode")) {
      return "Barcode นี้มีในระบบแล้ว"
    }
    return "ข้อมูลซ้ำในระบบ — ตรวจสอบรหัสที่กรอก"
  }
  if (error.code === "23503") {
    return "ไม่สามารถลบได้ — มีข้อมูลอ้างอิงอยู่ (เช่น คลังหรือสต็อก)"
  }
  return error.message
}

export function formatInventoryError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง"
  }
  if (error instanceof Error) return error.message
  return "เกิดข้อผิดพลาด"
}
