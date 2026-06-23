export function normalizeInventoryBarcode(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function formatInventoryBarcodeConflict(
  barcode: string,
  skuCodes: string[]
): string {
  const codes = [...new Set(skuCodes.map((code) => code.trim()).filter(Boolean))]
  const suffix =
    codes.length > 0 ? ` (${codes.join(", ")})` : ""

  return `barcode ${barcode} ถูกผูกกับหลาย SKU${suffix} — แก้ข้อมูล SKU ให้เหลือ 1 รายการต่อ 1 barcode ก่อนใช้งาน`
}
