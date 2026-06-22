// LINE Login v2.1 OAuth helpers — server-side only.
// Uses the LINE Login channel (not the Messaging API channel).

const LINE_AUTHORIZE_URL = "https://access.line.me/oauth2/v2.1/authorize"
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token"
const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

function redirectUri(baseUrl?: string): string {
  const origin = baseUrl?.trim().replace(/\/$/, "") || requireEnv("NEXT_PUBLIC_BASE_URL")
  return `${origin}/api/auth/line/callback`
}

export function buildAuthorizeUrl(state: string, baseUrl?: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("LINE_LOGIN_CHANNEL_ID"),
    redirect_uri: redirectUri(baseUrl),
    state,
    scope: "profile openid",
  })
  return `${LINE_AUTHORIZE_URL}?${params.toString()}`
}

export async function exchangeCode(code: string, baseUrl?: string): Promise<string> {
  const response = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(baseUrl),
      client_id: requireEnv("LINE_LOGIN_CHANNEL_ID"),
      client_secret: requireEnv("LINE_LOGIN_CHANNEL_SECRET"),
    }),
  })

  if (!response.ok) {
    throw new Error(`LINE token exchange failed: ${response.status}`)
  }

  const data = (await response.json()) as { id_token?: string }
  if (!data.id_token) {
    throw new Error("LINE token response has no id_token")
  }
  return data.id_token
}

export type LineIdTokenPayload = {
  sub: string
  name?: string
  picture?: string
}

// Verifies signature/expiry/audience on LINE's side — no local JWT handling needed.
export async function verifyIdToken(
  idToken: string
): Promise<LineIdTokenPayload> {
  const response = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: requireEnv("LINE_LOGIN_CHANNEL_ID"),
    }),
  })

  if (!response.ok) {
    throw new Error(`LINE id_token verification failed: ${response.status}`)
  }

  const payload = (await response.json()) as LineIdTokenPayload
  if (!payload.sub) {
    throw new Error("LINE id_token has no sub")
  }
  return payload
}
