import type { Metadata } from "next"
import { Inter, Noto_Sans_SC, Prompt } from "next/font/google"

import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const notoSansSc = Noto_Sans_SC({
  variable: "--font-noto-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
})

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
    <html
      lang="th"
      className={`${inter.variable} ${notoSansSc.variable} ${prompt.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col font-sans"
        style={{
          fontFamily:
            "var(--font-prompt), var(--font-inter), var(--font-noto-sc), system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  )
}
