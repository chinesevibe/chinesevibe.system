import type { webhook } from "@line/bot-sdk"

import { isHrGroupCommandText } from "@/lib/line/handlers/group-hr-commands"

/** 1:1 chat with the OA only — not group or room. */
export function isOneOnOneUserSource(
  source: webhook.Event["source"] | undefined
): source is webhook.UserSource {
  return source?.type === "user"
}

/** LINE user id of whoever tapped a button or sent a message (1:1, group, or room). */
export function resolveLineUserIdFromSource(
  source: webhook.Event["source"] | undefined
): string | undefined {
  if (!source) return undefined
  if (source.type === "user") return source.userId
  if (source.type === "group" || source.type === "room") {
    return source.userId
  }
  return undefined
}

/**
 * Group/room text messages are ignored — OA only pushes HR reports there.
 * Postbacks in group/room are handled (HR approval Flex buttons in HR group).
 * Join events are handled separately (capture group id).
 */
export function shouldHandleInteractiveEvent(event: webhook.Event): boolean {
  if (event.type === "postback") {
    return (
      isOneOnOneUserSource(event.source) ||
      event.source?.type === "group" ||
      event.source?.type === "room"
    )
  }
  if (
    event.type === "message" &&
    event.message.type === "text" &&
    (event.source?.type === "group" || event.source?.type === "room")
  ) {
    return isHrGroupCommandText(event.message.text)
  }
  return isOneOnOneUserSource(event.source)
}
