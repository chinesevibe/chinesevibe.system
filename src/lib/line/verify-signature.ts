import { validateSignature } from "@line/bot-sdk"

// Fail closed: missing secret or missing signature header always rejects.
// Must be called with the raw request body string, before any JSON.parse.
export function verifyLineSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret || !signature) {
    return false
  }
  return validateSignature(rawBody, channelSecret, signature)
}
