import type { messagingApi } from "@line/bot-sdk"

import {
  approveEmployeeRegistration,
  assertHrLineApprover,
  rejectEmployeeRegistration,
} from "@/lib/registration/approve"
import {
  parseRegistrationPostback,
  type RegistrationPostbackAction,
} from "@/lib/line/types"

export async function handleRegistrationPostback(
  action: RegistrationPostbackAction,
  employeeId: string,
  lineUserId: string | undefined
): Promise<messagingApi.Message[]> {
  const approver = await assertHrLineApprover(lineUserId)
  if (!approver) {
    return [
      {
        type: "text",
        text: "⛔ ไม่มีสิทธิ์อนุมัติ — ต้องเป็น HR หรือ Admin ที่ลงทะเบียน LINE ในระบบแล้ว",
      },
    ]
  }

  if (action === "approve_registration") {
    const result = await approveEmployeeRegistration(employeeId)
    if (!result.ok) {
      const msg =
        result.status === 404
          ? "ไม่พบคำขอลงทะเบียนนี้"
          : result.error === "invalid role"
            ? "ไม่ใช่คำขอลงทะเบียนพนักงาน"
            : "อนุมัติไม่สำเร็จ กรุณาลองใหม่หรือใช้ Dashboard"
      return [{ type: "text", text: `❌ ${msg}` }]
    }
    return [
      {
        type: "text",
        text: `✅ อนุมัติ ${result.employeeName} แล้ว\n\nโดย: ${approver.name}\nพนักงานใช้เมนู HR ใน LINE ได้แล้ว`,
      },
    ]
  }

  const result = await rejectEmployeeRegistration(employeeId)
  if (!result.ok) {
    return [{ type: "text", text: "❌ ปฏิเสธไม่สำเร็จ กรุณาลองใหม่" }]
  }
  return [
    {
      type: "text",
      text: `❌ ปฏิเสธคำขอของ ${result.employeeName} แล้ว\n\nโดย: ${approver.name}`,
    },
  ]
}

export function tryParseRegistrationPostback(data: string) {
  return parseRegistrationPostback(data)
}
