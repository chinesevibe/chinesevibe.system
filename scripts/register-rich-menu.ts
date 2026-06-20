// Registers the HR rich menu and sets it as default for all users.
//
// Usage:
//   LINE_CHANNEL_ACCESS_TOKEN=<token> NEXT_PUBLIC_BASE_URL=<url> npx tsx scripts/register-rich-menu.ts [imagePath]
//   (ต้องใช้ tsx — โค้ดใช้ "@/" path alias ซึ่ง node รันตรงๆ resolve ไม่ได้)
//
// imagePath defaults to public/rich-menu.png — 1200x810 PNG/JPEG, max 1MB.
import { existsSync } from "node:fs"

import { registerRichMenu } from "../src/lib/line/rich-menu"

async function main() {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set")
    process.exit(1)
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "")
  const clockLiffUri = base ? `${base}/liff/clock` : undefined
  if (clockLiffUri) {
    console.log(`Clock LIFF URI: ${clockLiffUri}`)
  } else {
    console.warn("NEXT_PUBLIC_BASE_URL not set — เช็คอิน button will use postback fallback")
  }

  const imagePath = process.argv[2] ?? "public/rich-menu.png"
  if (!existsSync(imagePath)) {
    console.error(
      `Rich menu image not found: ${imagePath} (expected 1200x810 PNG/JPEG, max 1MB)`
    )
    process.exit(1)
  }

  const richMenuId = await registerRichMenu(imagePath, clockLiffUri)
  console.log(`Rich menu registered and set as default: ${richMenuId}`)
}

main().catch((error) => {
  console.error("Failed to register rich menu:", error)
  process.exit(1)
})
