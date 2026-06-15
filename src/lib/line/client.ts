// Server-side only — never import from a client component.
// Clients are created lazily so a missing env var fails at request time,
// not at build/import time.
import { messagingApi } from "@line/bot-sdk"

let client: messagingApi.MessagingApiClient | null = null
let blobClient: messagingApi.MessagingApiBlobClient | null = null

function requireChannelAccessToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set")
  }
  return token
}

export function getLineClient(): messagingApi.MessagingApiClient {
  if (!client) {
    client = new messagingApi.MessagingApiClient({
      channelAccessToken: requireChannelAccessToken(),
    })
  }
  return client
}

export function getLineBlobClient(): messagingApi.MessagingApiBlobClient {
  if (!blobClient) {
    blobClient = new messagingApi.MessagingApiBlobClient({
      channelAccessToken: requireChannelAccessToken(),
    })
  }
  return blobClient
}
