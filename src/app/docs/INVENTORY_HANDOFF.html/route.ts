import { readFile } from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"

export const dynamic = "force-static"

export async function GET() {
  const filePath = path.join(process.cwd(), "public/docs/INVENTORY_HANDOFF.html")
  const html = await readFile(filePath, "utf-8")

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  })
}
