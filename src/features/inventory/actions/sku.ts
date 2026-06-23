"use server"

import { revalidatePath } from "next/cache"

import {
  assertInventoryManage,
  formatInventoryError,
  mapSupabaseInventoryError,
} from "@/features/inventory/actions/auth"
import type {
  InventoryActionState,
  InventorySkuImportState,
  InvSku,
  InvUnit,
} from "@/features/inventory/types"
import { invSkuSchema } from "@/features/inventory/validators/sku"
import {
  parseCsvBoolean,
  parseSkuCsv,
  type ParsedSkuCsvRow,
} from "@/lib/inventory/sku-csv"
import {
  INVENTORY_SKU_IMAGE_BUCKET,
  INVENTORY_SKU_IMAGE_MAX_BYTES,
  INVENTORY_SKU_IMAGE_TYPES,
  sanitizeInventorySkuImageFilename,
} from "@/lib/inventory/sku-image"
import {
  formatInventoryBarcodeConflict,
  normalizeInventoryBarcode,
} from "@/lib/inventory/barcode"
import { createClient } from "@/lib/supabase/server"

const LIST_PATH = "/admin/inventory/sku"

async function uploadSkuImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File
): Promise<string> {
  if (
    !INVENTORY_SKU_IMAGE_TYPES.includes(
      file.type as (typeof INVENTORY_SKU_IMAGE_TYPES)[number]
    )
  ) {
    throw new Error("รองรับเฉพาะ JPG, PNG, WEBP")
  }
  if (file.size <= 0 || file.size > INVENTORY_SKU_IMAGE_MAX_BYTES) {
    throw new Error("รูปภาพต้องไม่เกิน 5MB")
  }

  const path = `sku-images/${crypto.randomUUID()}-${sanitizeInventorySkuImageFilename(
    file.name
  )}`
  const { error } = await supabase.storage
    .from(INVENTORY_SKU_IMAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  const { data } = supabase.storage
    .from(INVENTORY_SKU_IMAGE_BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}

function formDataToObject(formData: FormData) {
  return {
    code: formData.get("code"),
    name: formData.get("name"),
    category: formData.get("category"),
    unit_id: formData.get("unit_id"),
    barcode: formData.get("barcode"),
    min_stock: formData.get("min_stock") ?? 0,
    max_stock: formData.get("max_stock") ?? 0,
    image_url: formData.get("image_url"),
    is_active: formData.get("is_active") ?? "false",
    expiry_required: formData.get("expiry_required") ?? "false",
    lot_tracking_required: formData.get("lot_tracking_required") ?? "true",
    default_issue_method: formData.get("default_issue_method") ?? "fefo",
    shelf_life_days: formData.get("shelf_life_days"),
    storage_type: formData.get("storage_type"),
  }
}

async function resolveSkuPayload(formData: FormData) {
  const payload = invSkuSchema.parse(formDataToObject(formData))
  const supabase = await createClient()
  const imageFile = formData.get("image_file")

  if (imageFile instanceof File && imageFile.size > 0) {
    payload.image_url = await uploadSkuImage(supabase, imageFile)
  }

  return { payload, supabase }
}

async function findBarcodeConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  barcode: string | null | undefined,
  excludeId?: string
): Promise<string | null> {
  const normalizedBarcode = normalizeInventoryBarcode(barcode)
  if (!normalizedBarcode) return null

  let query = supabase
    .from("inv_skus")
    .select("id, code")
    .eq("barcode", normalizedBarcode)
    .limit(2)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query
  if (error) throw error
  if (!data || data.length === 0) return null

  return formatInventoryBarcodeConflict(
    normalizedBarcode,
    data.map((row) => row.code as string)
  )
}

export async function createInvSku(formData: FormData): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const { payload, supabase } = await resolveSkuPayload(formData)
    const barcodeConflict = await findBarcodeConflict(supabase, payload.barcode)
    if (barcodeConflict) return { success: false, error: barcodeConflict }
    const { error } = await supabase.from("inv_skus").insert(payload)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function updateInvSku(
  id: string,
  formData: FormData
): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const { payload, supabase } = await resolveSkuPayload(formData)
    const barcodeConflict = await findBarcodeConflict(supabase, payload.barcode, id)
    if (barcodeConflict) return { success: false, error: barcodeConflict }
    const { error } = await supabase.from("inv_skus").update(payload).eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function deleteInvSku(id: string): Promise<InventoryActionState> {
  try {
    await assertInventoryManage()
    const supabase = await createClient()
    const { error } = await supabase.from("inv_skus").delete().eq("id", id)
    if (error) return { success: false, error: mapSupabaseInventoryError(error) }
    revalidatePath(LIST_PATH)
    return { success: true }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase()
}

function buildUnitLookup(units: InvUnit[]): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const unit of units) {
    lookup.set(normalizeLookup(unit.name), unit.id)
    if (unit.abbreviation) {
      lookup.set(normalizeLookup(unit.abbreviation), unit.id)
    }
  }
  return lookup
}

function toImportPayload(row: ParsedSkuCsvRow, unitLookup: Map<string, string>) {
  if (!row.code || !row.name) {
    return { ok: false as const, message: "ต้องมี code และ name" }
  }

  let unitId: string | null = null
  if (row.unit) {
    unitId = unitLookup.get(normalizeLookup(row.unit)) ?? null
    if (!unitId) {
      return { ok: false as const, message: `ไม่พบหน่วย "${row.unit}"` }
    }
  }

  try {
    const payload = invSkuSchema.parse({
      code: row.code,
      name: row.name,
      category: row.category,
      unit_id: unitId,
      barcode: row.barcode,
      min_stock: row.min_stock ?? "0",
      max_stock: row.max_stock ?? "0",
      image_url: row.image_url,
      is_active: parseCsvBoolean(row.is_active, true),
      expiry_required: parseCsvBoolean(row.expiry_required, false),
      lot_tracking_required: parseCsvBoolean(row.lot_tracking_required, true),
      default_issue_method: row.default_issue_method ?? "fefo",
      shelf_life_days: row.shelf_life_days ?? "",
      storage_type: row.storage_type ?? "",
    })

    return { ok: true as const, payload }
  } catch {
    return { ok: false as const, message: "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง" }
  }
}

export async function importInvSkuCsv(formData: FormData): Promise<InventorySkuImportState> {
  try {
    await assertInventoryManage()

    const file = formData.get("file")
    if (!(file instanceof File)) {
      return { success: false, error: "กรุณาเลือกไฟล์ CSV" }
    }

    const csvText = await file.text()
    const parsed = parseSkuCsv(csvText)
    if (!parsed.ok) {
      return { success: false, error: parsed.error }
    }
    const insertOnly =
      formData.get("import_mode")?.toString().trim() === "insert_only"

    const supabase = await createClient()
    const [{ data: unitRows, error: unitError }, { data: skuRows, error: skuError }] =
      await Promise.all([
        supabase.from("inv_units").select("id,name,abbreviation"),
        supabase.from("inv_skus").select("id,code,barcode"),
      ])

    if (unitError) throw new Error(unitError.message)
    if (skuError) throw new Error(skuError.message)

    const units = (unitRows ?? []) as InvUnit[]
    const unitLookup = buildUnitLookup(units)
    const existingByCode = new Map(
      ((skuRows ?? []) as Array<{ id: string; code: string }>).map((row) => [
        normalizeLookup(row.code),
        row.id,
      ])
    )
    const existingByBarcode = new Map(
      ((skuRows ?? []) as Array<{ id: string; code: string; barcode: string | null }>)
        .filter((row) => normalizeInventoryBarcode(row.barcode))
        .map((row) => [
          normalizeInventoryBarcode(row.barcode) as string,
          { id: row.id, code: row.code },
        ])
    )

    const rowErrors: NonNullable<InventorySkuImportState["rowErrors"]> = []
    const validRows: Array<{
      rowNumber: number
      code: string
      normalizedCode: string
      payload: ReturnType<typeof invSkuSchema.parse>
    }> = []
    let skippedCount = 0
    const seenCodes = new Map<string, number>()
    const seenBarcodes = new Map<string, { rowNumber: number; code: string }>()

    for (const row of parsed.rows) {
      const prepared = toImportPayload(row, unitLookup)

      if (!prepared.ok) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          code: row.code || undefined,
          message: prepared.message,
        })
        continue
      }

      const normalizedCode = normalizeLookup(prepared.payload.code)
      const firstSeenRow = seenCodes.get(normalizedCode)
      if (firstSeenRow) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          code: prepared.payload.code,
          message: `code ซ้ำในไฟล์เดียวกัน (ซ้ำกับแถว ${firstSeenRow})`,
        })
        continue
      }
      seenCodes.set(normalizedCode, row.rowNumber)

      const normalizedBarcode = normalizeInventoryBarcode(prepared.payload.barcode)
      if (normalizedBarcode) {
        const firstSeenBarcode = seenBarcodes.get(normalizedBarcode)
        if (firstSeenBarcode && firstSeenBarcode.code !== prepared.payload.code) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            code: prepared.payload.code,
            message: `barcode ซ้ำในไฟล์เดียวกัน (ซ้ำกับแถว ${firstSeenBarcode.rowNumber})`,
          })
          continue
        }

        const existingBarcode = existingByBarcode.get(normalizedBarcode)
        const existingId = existingByCode.get(normalizedCode)
        if (existingBarcode && existingBarcode.id !== existingId) {
          rowErrors.push({
            rowNumber: row.rowNumber,
            code: prepared.payload.code,
            message: formatInventoryBarcodeConflict(normalizedBarcode, [
              existingBarcode.code,
            ]),
          })
          continue
        }

        seenBarcodes.set(normalizedBarcode, {
          rowNumber: row.rowNumber,
          code: prepared.payload.code,
        })
      }

      if (insertOnly && existingByCode.has(normalizedCode)) {
        skippedCount += 1
        continue
      }

      validRows.push({
        rowNumber: row.rowNumber,
        code: prepared.payload.code,
        normalizedCode,
        payload: prepared.payload,
      })
    }

    let createdCount = 0
    let updatedCount = 0

    for (const row of validRows) {
      const wasExisting = existingByCode.has(row.normalizedCode)
      const query = insertOnly
        ? supabase.from("inv_skus").insert(row.payload)
        : supabase.from("inv_skus").upsert(row.payload, {
            onConflict: "code",
          })
      const { error } = await query
      if (error) {
        rowErrors.push({
          rowNumber: row.rowNumber,
          code: row.code,
          message: mapSupabaseInventoryError(error),
        })
        continue
      }

      const normalizedBarcode = normalizeInventoryBarcode(row.payload.barcode)
      if (normalizedBarcode) {
        existingByBarcode.set(normalizedBarcode, {
          id: existingByCode.get(row.normalizedCode) ?? `import:${row.normalizedCode}`,
          code: row.payload.code,
        })
      }
      existingByCode.set(
        row.normalizedCode,
        existingByCode.get(row.normalizedCode) ?? `import:${row.normalizedCode}`
      )

      if (insertOnly || !wasExisting) {
        createdCount += 1
      } else {
        updatedCount += 1
      }
    }

    revalidatePath(LIST_PATH)
    return {
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
      errorCount: rowErrors.length,
      rowErrors,
    }
  } catch (error) {
    return { success: false, error: formatInventoryError(error) }
  }
}

export async function getInvSkus(search?: string): Promise<InvSku[]> {
  const supabase = await createClient()
  const trimmedSearch = search?.trim()
  let query = supabase.from("inv_skus").select("*").order("code", { ascending: true })

  if (trimmedSearch) {
    query = query.or(
      `code.ilike.%${trimmedSearch}%,name.ilike.%${trimmedSearch}%,category.ilike.%${trimmedSearch}%,barcode.ilike.%${trimmedSearch}%`
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as InvSku[]
}

export async function getInvSku(id: string): Promise<InvSku | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_skus")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as InvSku | null
}

export async function getInvUnits(): Promise<InvUnit[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inv_units")
    .select("id,name,abbreviation")
    .order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as InvUnit[]
}
