import type { Metadata } from "next"
import { SpeedInsights } from "@vercel/speed-insights/next"

import "./globals.css"

export const metadata: Metadata = {
  title: "CNV WorkHub — HR Admin",
  description: "CNV WorkHub — HR Admin dashboard for workforce, attendance, and leave management",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col font-sans"
        style={{
          fontFamily:
            "var(--font-prompt), var(--font-inter), var(--font-noto-sc), system-ui, sans-serif",
        }}
      >
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
