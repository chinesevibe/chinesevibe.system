import type { webhook } from "@line/bot-sdk"

import { resolveLocaleForLineUser } from "@/lib/i18n/employee-locale"
import { DEFAULT_LOCALE } from "@/lib/i18n/types"
import { getLineClient } from "@/lib/line/client"
import { handleMessage } from "@/lib/line/handlers/message"
import { handlePostback } from "@/lib/line/handlers/postback"
import { shouldHandleInteractiveEvent } from "@/lib/line/handlers/source"
import { buildWelcomeFollowMessages } from "@/lib/line/welcome-messages"

async function handleFollow(event: webhook.FollowEvent): Promise<void> {
  if (!event.replyToken) {
    return
  }

  const lineUserId =
    event.source?.type === "user" ? event.source.userId : undefined
  const locale = lineUserId
    ? await resolveLocaleForLineUser(lineUserId)
    : DEFAULT_LOCALE

  await getLineClient().replyMessage({
    replyToken: event.replyToken,
    messages: buildWelcomeFollowMessages(locale),
  })
}

async function handleJoin(event: webhook.JoinEvent): Promise<void> {
  if (event.source?.type === "group" && event.source.groupId) {
    console.info("LINE join groupId", event.source.groupId)
  }
}

async function handleEvent(event: webhook.Event): Promise<void> {
  if (event.type === "join") {
    return handleJoin(event)
  }

  // Never auto-reply in group/room — HR group is push-only (reports).
  if (!shouldHandleInteractiveEvent(event)) {
    return
  }

  switch (event.type) {
    case "postback":
      return handlePostback(event)
    case "message":
      return handleMessage(event)
    case "follow":
      return handleFollow(event)
    default:
      return
  }
}

// A failing reply must never bubble up: the webhook still answers 200,
// otherwise LINE keeps retrying the whole batch.
export async function handleEvents(events: webhook.Event[]): Promise<void> {
  for (const event of events) {
    try {
      await handleEvent(event)
    } catch (error) {
      console.error("LINE event handler failed", {
        type: event.type,
        error,
      })
    }
  }
}
