import { redirect } from "next/navigation"

import { canAccessPortalInventoryWorkspace } from "@/lib/auth/roles"
import { getCurrentEmployee } from "@/lib/auth/session"

export default async function MobileInventoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const employee = await getCurrentEmployee()

  if (!employee) {
    redirect("/login?next=/m/inventory")
  }

  if (!canAccessPortalInventoryWorkspace(employee)) {
    redirect("/portal")
  }

  return (
    <>
      <head>
        <link rel="manifest" href="/m/inventory/manifest.json" />
        <meta name="theme-color" content="#E11D2A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      {children}
    </>
  )
}

