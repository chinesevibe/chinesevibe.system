export const LINE_REGISTER_COOKIE = "line_register_uid"

export const LINE_REGISTER_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
}
