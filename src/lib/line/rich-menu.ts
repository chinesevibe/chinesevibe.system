// Rich menu image spec: 1200x810 PNG or JPEG, max 1MB (LINE compact size).
// Layout: 2 rows × 3 columns — เช็คอิน | OT | เอกสาร / ขอลา | ร้องเรียน | ติดต่อ HR
// เช็คสต็อก: พิมพ์ /stock ในแชท (LINE_STOCK_COMMAND_ENABLED=true)
import { readFile } from "node:fs/promises"

import type { messagingApi } from "@line/bot-sdk"

import { getLineBlobClient, getLineClient } from "@/lib/line/client"

const W = 1200
const H = 810
const COL = W / 3
const ROW = H / 2

export const HR_RICH_MENU: messagingApi.RichMenuRequest = {
  size: { width: W, height: H },
  selected: true,
  name: "hr-main-menu-v3",
  chatBarText: "เมนู HR",
  areas: [
    {
      bounds: { x: 0, y: 0, width: COL, height: ROW },
      action: {
        type: "postback",
        data: "action=checkin",
        label: "เช็คอิน-เช็คเอาท์",
      },
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

// Requires LINE_CHANNEL_ACCESS_TOKEN. Run via scripts/register-rich-menu.ts.
export async function registerRichMenu(imagePath: string): Promise<string> {
  const image = await readFile(imagePath)
  const contentType = imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg")
    ? "image/jpeg"
    : "image/png"

  const { richMenuId } = await getLineClient().createRichMenu(HR_RICH_MENU)
  await getLineBlobClient().setRichMenuImage(
    richMenuId,
    new Blob([new Uint8Array(image)], { type: contentType })
  )
  await getLineClient().setDefaultRichMenu(richMenuId)

  return richMenuId
}
