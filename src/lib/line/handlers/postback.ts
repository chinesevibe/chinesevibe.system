import type { messagingApi, webhook } from "@line/bot-sdk"

import { getLineClient } from "@/lib/line/client"
import { buildActionMessages } from "@/lib/line/handlers/actions"
import { handleApprovalPostback } from "@/lib/line/handlers/approval-postback"
import {
  handleRegistrationPostback,
  tryParseRegistrationPostback,
} from "@/lib/line/handlers/registration-postback"
import { lineAccessGateMessages } from "@/lib/line/line-access-gate"
import { resolveLineUserIdFromSource } from "@/lib/line/handlers/source"
import { notifyHrGroup } from "@/lib/line/notify-hr"
import { parseApprovalPostback, parsePostbackAction } from "@/lib/line/types"
import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { t } from "@/lib/i18n/translate"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"

async function fallbackText(lineUserId?: string): Promise<messagingApi.Message> {
  const locale = lineUserId
    ? await resolveLocaleForLineUser(lineUserId)
    : DEFAULT_LOCALE
  return {
    type: "text",
    text: t("line.error.unknownMenu", locale),
  }
}

async function replyOrPushGroup(
  event: webhook.PostbackEvent,
  messages: messagingApi.Message[]
): Promise<void> {
  if (!event.replyToken) return

  try {
    await getLineClient().replyMessage({
      replyToken: event.replyToken,
      messages,
    })
    return
  } catch (error) {
    console.warn("postback reply failed, trying group push", error)
  }

  const groupId =
    event.source?.type === "group"
      ? event.source.groupId
      : event.source?.type === "room"
        ? event.source.roomId
        : undefined

  if (groupId) {
    await notifyHrGroup(messages)
    return
  }

  throw new Error("postback reply failed and no group target for push")
}

export async function handlePostback(
  event: webhook.PostbackEvent
): Promise<void> {
  if (!event.replyToken) {
    return
  }

  const lineUserId = resolveLineUserIdFromSource(event.source)

  const registration = tryParseRegistrationPostback(event.postback.data)
  const approval = parseApprovalPostback(event.postback.data)
  const action = parsePostbackAction(event.postback.data)

  let messages: messagingApi.Message[]
  if (registration) {
    messages = await handleRegistrationPostback(
      registration.action,
      registration.employeeId,
      lineUserId
    )
  } else if (approval) {
    messages = await handleApprovalPostback(approval, lineUserId)
  } else if (!action) {
    messages = [await fallbackText(lineUserId)]
  } else {
    const blocked = await lineAccessGateMessages(lineUserId, action)
    const locale = lineUserId
      ? await resolveLocaleForLineUser(lineUserId)
      : DEFAULT_LOCALE
    messages =
      blocked ?? (await buildActionMessages(action, { lineUserId, locale }))
  }

  try {
    await replyOrPushGroup(event, messages)
  } catch (error) {
    throw new Error(
      `postback reply failed (action=${action ?? approval?.action ?? "unknown"})`,
      { cause: error }
    )
  }
}
