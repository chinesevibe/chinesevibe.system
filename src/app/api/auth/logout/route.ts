import { NextResponse, type NextRequest } from "next/server"

import { clearOfficerPasswordVerifiedCookie } from "@/lib/auth/officer-password-session"
import { createClient } from "@/lib/supabase/server"

function loginUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  return new URL("/login", configured || request.nextUrl.origin)
}

async function signOutAndRedirect(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const response = NextResponse.redirect(loginUrl(request))
  clearOfficerPasswordVerifiedCookie(response)
  return response
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request)
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request)
}
