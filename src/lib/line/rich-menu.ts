// Rich menu image spec: 1200x810 PNG or JPEG, max 1MB (LINE compact size).
// Layout: 2 rows × 3 columns — เช็คอิน | OT | เอกสาร / ขอลา | ร้องเรียน | ติดต่อ HR
// เช็คสต็อก: พิมพ์ /stock ในแชท (LINE_STOCK_COMMAND_ENABLED=true)
import { readFile } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"
import { Buffer } from "node:buffer"

import type { messagingApi } from "@line/bot-sdk"

import { getLineBlobClient, getLineClient } from "@/lib/line/client"

const W = 1200
const H = 810
const COL = W / 3
const ROW = H / 2

export function buildClockLiffUri(baseUrl?: string, liffId?: string): string | undefined {
  const normalizedLiffId = liffId?.trim() || process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim()
  if (normalizedLiffId) {
    return `https://liff.line.me/${normalizedLiffId}`
  }

  const normalizedBase =
    baseUrl?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
    ""
  return normalizedBase ? `${normalizedBase}/liff/clock` : undefined
}

function contentTypeForImagePath(imagePath: string, fallback = "image/png") {
  return imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg")
    ? "image/jpeg"
    : imagePath.endsWith(".png")
      ? "image/png"
      : fallback
}

export function buildHrRichMenu(clockLiffUri?: string): messagingApi.RichMenuRequest {
  const clockAction: messagingApi.RichMenuArea["action"] = clockLiffUri
    ? { type: "uri", uri: clockLiffUri, label: "เช็คอิน-เช็คเอาท์" }
    : { type: "postback", data: "action=checkin", label: "เช็คอิน-เช็คเอาท์" }

  return {
    size: { width: W, height: H },
    selected: true,
    name: "hr-main-menu-v4",
    chatBarText: "เมนู HR",
    areas: [
      {
        bounds: { x: 0, y: 0, width: COL, height: ROW },
        action: clockAction,
      },
      {
        bounds: { x: COL, y: 0, width: COL, height: ROW },
        action: {
          type: "postback",
          data: "action=overtime",
          label: "ขอทำงานล่วงเวลา",
        },
      },
      {
        bounds: { x: COL * 2, y: 0, width: COL, height: ROW },
        action: {
          type: "postback",
          data: "action=document",
          label: "ขอเอกสารสำคัญ",
        },
      },
      {
        bounds: { x: 0, y: ROW, width: COL, height: ROW },
        action: {
          type: "postback",
          data: "action=leave",
          label: "ขอลา",
        },
      },
      {
        bounds: { x: COL, y: ROW, width: COL, height: ROW },
        action: {
          type: "postback",
          data: "action=complaint",
          label: "แจ้งเรื่องร้องเรียน",
        },
      },
      {
        bounds: { x: COL * 2, y: ROW, width: COL, height: ROW },
        action: {
          type: "postback",
          data: "action=contact_hr",
          label: "ติดต่อ HR",
        },
      },
    ],
  }
}

// Requires LINE_CHANNEL_ACCESS_TOKEN + NEXT_PUBLIC_BASE_URL. Run via scripts/register-rich-menu.ts.
export async function registerRichMenu(imagePath: string, clockLiffUri?: string): Promise<string> {
  let image: Buffer
  let contentType = contentTypeForImagePath(imagePath)

  if (/^https?:\/\//i.test(imagePath)) {
    const response = await fetch(imagePath)
    if (!response.ok) {
      throw new Error(`failed to fetch rich menu image: ${response.status} ${response.statusText}`)
    }
    image = Buffer.from(await response.arrayBuffer())
    contentType = response.headers.get("content-type") ?? contentType
  } else {
    const resolvedImagePath = isAbsolute(imagePath)
      ? imagePath
      : resolve(process.cwd(), imagePath)
    image = await readFile(resolvedImagePath)
  }

  const { richMenuId } = await getLineClient().createRichMenu(buildHrRichMenu(clockLiffUri))
  await getLineBlobClient().setRichMenuImage(
    richMenuId,
    new Blob([image as unknown as BlobPart], { type: contentType })
  )
  await getLineClient().setDefaultRichMenu(richMenuId)

  return richMenuId
}
