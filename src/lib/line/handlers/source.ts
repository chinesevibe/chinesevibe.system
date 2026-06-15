import type { webhook } from "@line/bot-sdk"

/** 1:1 chat with the OA only — not group or room. */
export function isOneOnOneUserSource(
  source: webhook.Event["source"] | undefined
): source is webhook.UserSource {
  return source?.type === "user"
}

/**
 * Group/room events are ignored for replies — OA only pushes HR reports there.
 * Join events are handled separately (capture group id).
 */
export function shouldHandleInteractiveEvent(event: webhook.Event): boolean {
  return isOneOnOneUserSource(event.source)
}
