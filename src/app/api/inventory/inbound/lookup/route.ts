import { NextResponse } from "next/server"

import {
  inactiveSkuBarcodeMessage,
  lookupSkuByBarcode,
} from "@/features/inventory/inbound-data"
import { getCurrentEmployee } from "@/lib/auth/session"

export async function GET(request: Request) {
  const employee = await getCurrentEmployee()
  if (!employee || employee.status !== "active") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const barcode = new URL(request.url).searchParams.get("barcode")?.trim()
  if (!barcode) {
    return NextResponse.json({ error: "barcode required" }, { status: 400 })
  }

  try {
    const sku = await lookupSkuByBarcode(barcode)
    if (!sku) {
      const inactive = await inactiveSkuBarcodeMessage(barcode)
      return NextResponse.json(
        { error: inactive ?? "ไม่พบ SKU จาก barcode นี้" },
        { status: 404 }
      )
    }
    return NextResponse.json({ sku })
  } catch (error) {
    const message = error instanceof Error ? error.message : "lookup failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
