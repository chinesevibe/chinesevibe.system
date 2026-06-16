import type { messagingApi } from "@line/bot-sdk"

import { getAdminClient } from "@/lib/auth/admin-client"
import { notifyHrGroup, pushToLineUser } from "@/lib/line/notify-hr"

export async function getApproverDisplayName(
  approverId: string
): Promise<string> {
  try {
    const { data } = await getAdminClient()
      .from("hr_employees")
      .select("name")
      .eq("id", approverId)
      .maybeSingle()
    const name = (data?.name as string | undefined)?.trim()
    return name || "HR"
  } catch {
    return "HR"
  }
}

/** Best-effort: notify requester (LINE) and HR LINE group after a decision. */
export async function notifyDecisionParties(options: {
  employeeLineUserId?: string | null
  employeeMessages?: messagingApi.Message[]
  hrGroupText: string
}): Promise<void> {
  const { employeeLineUserId, employeeMessages, hrGroupText } = options

  if (employeeLineUserId && employeeMessages && employeeMessages.length > 0) {
    try {
      await pushToLineUser(employeeLineUserId, employeeMessages)
    } catch (error) {
      console.error("decision notify employee failed:", error)
    }
  }

  try {
    await notifyHrGroup([{ type: "text", text: hrGroupText }])
  } catch (error) {
    console.error("decision notify HR group failed:", error)
  }
}
