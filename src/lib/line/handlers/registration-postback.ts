import type { messagingApi } from "@line/bot-sdk"

import { handleRegistrationApproval } from "@/lib/line/handlers/approval-postback"
import {
  parseRegistrationPostback,
  type RegistrationPostbackAction,
} from "@/lib/line/types"

export async function handleRegistrationPostback(
  action: RegistrationPostbackAction,
  employeeId: string,
  lineUserId: string | undefined
): Promise<messagingApi.Message[]> {
  return handleRegistrationApproval(action, employeeId, lineUserId)
}

export function tryParseRegistrationPostback(data: string) {
  return parseRegistrationPostback(data)
}
