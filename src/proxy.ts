import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

// Session refresh on all matched routes; /admin/* additionally requires a
// logged-in user. Role-level checks (hr/admin) live in admin/layout.tsx —
// they need a DB read, which stays out of the proxy hot path.
function publicOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  return configured || request.nextUrl.origin
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl
  const origin = publicOrigin(request)

  if (
    (pathname.startsWith("/admin") || pathname.startsWith("/portal")) &&
    !user
  ) {
    return NextResponse.redirect(new URL("/login", origin))
  }

  // Never auto-redirect /login → /admin here (caused ERR_TOO_MANY_REDIRECTS when
  // Supabase session existed but hr_employees lookup failed). Post-login routing
  // is handled by /api/auth/line/callback; logged-in users use the login page CTA.

  response.headers.set("x-pathname", pathname)
  return response
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/portal/:path*",
    "/liff/:path*",
    "/login",
    "/register/:path*",
    "/employee",
  ],
}
