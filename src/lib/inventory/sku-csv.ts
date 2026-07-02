export type ParsedSkuCsvRow = {
  rowNumber: number
  code: string
  name: string
  category?: string
  unit?: string
  barcode?: string
  min_stock?: string
  max_stock?: string
  image_url?: string
  is_active?: string
  expiry_required?: string
  lot_tracking_required?: string
  default_issue_method?: string
  shelf_life_days?: string
  storage_type?: string
}

type CsvHeaderKey = Exclude<keyof ParsedSkuCsvRow, "rowNumber">

const HEADER_ALIASES: Record<CsvHeaderKey, readonly string[]> = {
  code: ["code", "sku_code", "sku", "รหัส", "รหัส sku", "รหัสสินค้า"],
  name: ["name", "sku_name", "ชื่อ", "ชื่อสินค้า"],
  category: ["category", "หมวด", "หมวดหมู่"],
  unit: ["unit", "unit_name", "หน่วย"],
  barcode: ["barcode", "บาร์โค้ด"],
  min_stock: ["min_stock", "min stock", "min", "minimum", "สต็อกขั้นต่ำ", "ขั้นต่ำ"],
  max_stock: ["max_stock", "max stock", "max", "maximum", "สต็อกสูงสุด", "สูงสุด"],
  image_url: ["image_url", "image", "image url", "รูป", "url รูปภาพ"],
  is_active: ["is_active", "active", "status", "สถานะ", "ใช้งาน"],
  expiry_required: ["expiry_required", "require_expiry", "วันหมดอายุ", "บังคับวันหมดอายุ"],
  lot_tracking_required: [
    "lot_tracking_required",
    "lot_tracking",
    "lot track",
    "lot tracking",
    "ติดตาม lot",
    "lot",
  ],
  default_issue_method: [
    "default_issue_method",
    "issue_method",
    "issue method",
    "วิธีจ่าย",
    "วิธีจ่ายเริ่มต้น",
  ],
  shelf_life_days: ["shelf_life_days", "shelf_life", "อายุเก็บ", "อายุเก็บวัน"],
  storage_type: ["storage_type", "storage", "ประเภทจัดเก็บ", "จัดเก็บ"],
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentField = ""
  let inQuotes = false
  const input = text.replace(/^\uFEFF/, "")

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]
    const next = input[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField)
      currentField = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1
      currentRow.push(currentField)
      rows.push(currentRow)
      currentRow = []
      currentField = ""
      continue
    }

    currentField += char
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField)
    rows.push(currentRow)
  }

  return rows
}

function buildHeaderMap(headerRow: string[]): Map<string, number> {
  const normalizedHeaders = headerRow.map(normalizeHeader)
  const headerMap = new Map<string, number>()

  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [CsvHeaderKey, readonly string[]]
  >) {
    const index = normalizedHeaders.findIndex((header) => aliases.includes(header))
    if (index >= 0) headerMap.set(key, index)
  }

  return headerMap
}

function readCell(row: string[], index?: number): string | undefined {
  if (index == null || index < 0 || index >= row.length) return undefined
  const value = row[index]?.trim()
  return value ? value : undefined
}

export function parseSkuCsv(text: string):
  | { ok: true; rows: ParsedSkuCsvRow[] }
  | { ok: false; error: string } {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim().length > 0))
  if (rows.length === 0) {
    return { ok: false, error: "ไฟล์ CSV ว่างเปล่า" }
  }

  const [headerRow, ...dataRows] = rows
  const headerMap = buildHeaderMap(headerRow)

  if (!headerMap.has("code") || !headerMap.has("name")) {
    return {
      ok: false,
      error: "หัวตารางต้องมีอย่างน้อย code และ name",
    }
  }

  const parsedRows = dataRows.map((row, index) => ({
    rowNumber: index + 2,
    code: readCell(row, headerMap.get("code")) ?? "",
    name: readCell(row, headerMap.get("name")) ?? "",
    category: readCell(row, headerMap.get("category")),
    unit: readCell(row, headerMap.get("unit")),
    barcode: readCell(row, headerMap.get("barcode")),
    min_stock: readCell(row, headerMap.get("min_stock")),
    max_stock: readCell(row, headerMap.get("max_stock")),
    image_url: readCell(row, headerMap.get("image_url")),
    is_active: readCell(row, headerMap.get("is_active")),
    expiry_required: readCell(row, headerMap.get("expiry_required")),
    lot_tracking_required: readCell(row, headerMap.get("lot_tracking_required")),
    default_issue_method: readCell(row, headerMap.get("default_issue_method")),
    shelf_life_days: readCell(row, headerMap.get("shelf_life_days")),
    storage_type: readCell(row, headerMap.get("storage_type")),
  }))

  return { ok: true, rows: parsedRows }
}

export function parseCsvBoolean(value?: string, fallback = true): string {
  if (!value) return fallback ? "true" : "false"
  const normalized = value.trim().toLowerCase()
  if (["true", "1", "yes", "y", "on", "active", "ใช้งาน", "✓", "✔"].includes(normalized)) {
    return "true"
  }
  if (["false", "0", "no", "n", "off", "inactive", "ปิด", "✗", "✘"].includes(normalized)) {
    return "false"
  }
  return fallback ? "true" : "false"
}
