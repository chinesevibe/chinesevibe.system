import { createServerClient } from "@supabase/ssr"
import type { NextRequest, NextResponse } from "next/server"

import { getAdminClient } from "@/lib/auth/admin-client"
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env"

/** Mint Supabase session cookies on `response` for a LINE-linked user. */
export async function mintLineUserSession(
  request: NextRequest,
  response: NextResponse,
  lineUserId: string
): Promise<void> {
  const admin = getAdminClient()
  const email = `line_${lineUserId.toLowerCase()}@line.local`

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({ type: "magiclink", email })
  if (linkError || !linkData?.properties?.hashed_token) {
    throw linkError ?? new Error("generateLink returned no token")
  }

  const { error: metaError } = await admin.auth.admin.updateUserById(
    linkData.user.id,
    { app_metadata: { provider: "line", line_user_id: lineUserId } }
  )
  if (metaError) throw metaError

  const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: linkData.properties.hashed_token,
  })
  if (otpError) throw otpError

  if (otpData.session) {
    const { error: setError } = await supabase.auth.setSession({
      access_token: otpData.session.access_token,
      refresh_token: otpData.session.refresh_token,
    })
    if (setError) throw setError
  }
}
