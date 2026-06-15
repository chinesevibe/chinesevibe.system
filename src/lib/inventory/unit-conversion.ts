import { createClient } from "@/lib/supabase/server"

export type UnitConversionErrorCode =
  | "INVALID_QUANTITY"
  | "SKU_INACTIVE_OR_MISSING"
  | "MISSING_BASE_UNIT"
  | "MISSING_SELECTED_UNIT"
  | "MISSING_TARGET_UNIT"
  | "MISSING_CONVERSION"
  | "INVALID_FACTOR"

export class UnitConversionError extends Error {
  code: UnitConversionErrorCode

  constructor(code: UnitConversionErrorCode, message: string) {
    super(message)
    this.name = "UnitConversionError"
    this.code = code
  }
}

export type UnitConversionUnit = {
  id: string
  name: string
  abbreviation: string | null
}

export type UnitConversionResult = {
  skuId: string
  quantity: number
  convertedQuantity: number
  inputQuantity: number
  outputQuantity: number
  fromUnit: UnitConversionUnit
  toUnit: UnitConversionUnit
  factor: number
  conversionFactor: number
  isIdentity: boolean
}

export type SkuUnitOption = UnitConversionUnit & {
  unit: UnitConversionUnit
  label: string
  isBaseUnit: boolean
  factorToBaseUnit: number
  conversionFactorToBase: number
  conversionLabel: string
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type SkuWithBaseUnit = {
  id: string
  unit_id: string | null
  is_active: boolean
  inv_units: UnitConversionUnit | UnitConversionUnit[] | null
}

type UnitConversionRow = {
  id: string
  from_unit_id: string | null
  to_unit_id: string | null
  factor: number | string | null
}

export function formatUnitLabel(unit: UnitConversionUnit): string {
  return unit.abbreviation ? `${unit.name} (${unit.abbreviation})` : unit.name
}

export async function convertQuantity(
  skuId: string,
  qty: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined
): Promise<UnitConversionResult> {
  assertValidQuantity(qty)

  const fromUnitId = normalizeUnitId(fromUnit)
  if (!fromUnitId) {
    throw new UnitConversionError(
      "MISSING_SELECTED_UNIT",
      "Selected unit is required."
    )
  }

  const toUnitId = normalizeUnitId(toUnit)
  if (!toUnitId) {
    throw new UnitConversionError("MISSING_TARGET_UNIT", "Target unit is required.")
  }

  const supabase = await createClient()
  await getActiveSkuBaseUnit(supabase, skuId)
  const unitsById = await getUnitsById(supabase, [fromUnitId, toUnitId])
  const selectedUnit = unitsById.get(fromUnitId)
  if (!selectedUnit) {
    throw new UnitConversionError(
      "MISSING_SELECTED_UNIT",
      "Selected unit was not found."
    )
  }

  const targetUnit = unitsById.get(toUnitId)
  if (!targetUnit) {
    throw new UnitConversionError("MISSING_TARGET_UNIT", "Target unit was not found.")
  }

  if (fromUnitId === toUnitId) {
    return {
      skuId,
      quantity: qty,
      convertedQuantity: qty,
      inputQuantity: qty,
      outputQuantity: qty,
      fromUnit: selectedUnit,
      toUnit: targetUnit,
      factor: 1,
      conversionFactor: 1,
      isIdentity: true,
    }
  }

  const rows = await getConversionRowsBetween(supabase, fromUnitId, toUnitId)
  const direct = rows.find(
    (row) => row.from_unit_id === fromUnitId && row.to_unit_id === toUnitId
  )

  if (direct) {
    const factor = parseConversionFactor(direct.factor)
    return {
      skuId,
      quantity: qty,
      convertedQuantity: qty * factor,
      inputQuantity: qty,
      outputQuantity: qty * factor,
      fromUnit: selectedUnit,
      toUnit: targetUnit,
      factor,
      conversionFactor: factor,
      isIdentity: false,
    }
  }

  const inverse = rows.find(
    (row) => row.from_unit_id === toUnitId && row.to_unit_id === fromUnitId
  )

  if (inverse) {
    const inverseFactor = parseConversionFactor(inverse.factor)
    const factor = 1 / inverseFactor
    return {
      skuId,
      quantity: qty,
      convertedQuantity: qty * factor,
      inputQuantity: qty,
      outputQuantity: qty * factor,
      fromUnit: selectedUnit,
      toUnit: targetUnit,
      factor,
      conversionFactor: factor,
      isIdentity: false,
    }
  }

  throw new UnitConversionError(
    "MISSING_CONVERSION",
    "No unit conversion factor was found."
  )
}

export async function getSkuUnitOptions(skuId: string): Promise<SkuUnitOption[]> {
  const supabase = await createClient()
  const baseUnit = await getActiveSkuBaseUnit(supabase, skuId)

  const { data, error } = await supabase
    .from("inv_unit_conversions")
    .select("id, from_unit_id, to_unit_id, factor")
    .or(`from_unit_id.eq.${baseUnit.id},to_unit_id.eq.${baseUnit.id}`)
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)

  const conversionRows = (data ?? []) as UnitConversionRow[]
  const relatedUnitIds = new Set<string>([baseUnit.id])

  conversionRows.forEach((row) => {
    if (row.from_unit_id === baseUnit.id && row.to_unit_id) {
      relatedUnitIds.add(row.to_unit_id)
    }
    if (row.to_unit_id === baseUnit.id && row.from_unit_id) {
      relatedUnitIds.add(row.from_unit_id)
    }
  })

  const unitsById = await getUnitsById(supabase, [...relatedUnitIds])
  const optionsById = new Map<string, SkuUnitOption>()
  optionsById.set(baseUnit.id, {
    ...baseUnit,
    unit: baseUnit,
    label: formatUnitLabel(baseUnit),
    isBaseUnit: true,
    factorToBaseUnit: 1,
    conversionFactorToBase: 1,
    conversionLabel: `1 ${formatUnitLabel(baseUnit)} = 1 ${formatUnitLabel(baseUnit)}`,
  })

  conversionRows.forEach((row) => {
    const factor = parseConversionFactor(row.factor)
    if (row.from_unit_id === baseUnit.id && row.to_unit_id) {
      const unit = unitsById.get(row.to_unit_id)
      if (unit && !optionsById.has(unit.id)) {
        optionsById.set(unit.id, {
          ...unit,
          unit,
          label: formatUnitLabel(unit),
          isBaseUnit: false,
          factorToBaseUnit: 1 / factor,
          conversionFactorToBase: 1 / factor,
          conversionLabel: `1 ${formatUnitLabel(unit)} = ${1 / factor} ${formatUnitLabel(baseUnit)}`,
        })
      }
    }

    if (row.to_unit_id === baseUnit.id && row.from_unit_id) {
      const unit = unitsById.get(row.from_unit_id)
      if (unit && !optionsById.has(unit.id)) {
        optionsById.set(unit.id, {
          ...unit,
          unit,
          label: formatUnitLabel(unit),
          isBaseUnit: false,
          factorToBaseUnit: factor,
          conversionFactorToBase: factor,
          conversionLabel: `1 ${formatUnitLabel(unit)} = ${factor} ${formatUnitLabel(baseUnit)}`,
        })
      }
    }
  })

  return [...optionsById.values()].sort((a, b) => {
    if (a.isBaseUnit) return -1
    if (b.isBaseUnit) return 1
    return a.label.localeCompare(b.label)
  })
}

function assertValidQuantity(qty: number) {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new UnitConversionError(
      "INVALID_QUANTITY",
      "Quantity must be a positive finite number."
    )
  }
}

function normalizeUnitId(unitId: string | null | undefined): string {
  return unitId?.trim() ?? ""
}

function parseConversionFactor(factor: number | string | null): number {
  const parsed = Number(factor)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new UnitConversionError(
      "INVALID_FACTOR",
      "Unit conversion factor must be a positive finite number."
    )
  }
  return parsed
}

async function getActiveSkuBaseUnit(
  supabase: SupabaseClient,
  skuId: string
): Promise<UnitConversionUnit> {
  const { data, error } = await supabase
    .from("inv_skus")
    .select("id, unit_id, is_active, inv_units(id, name, abbreviation)")
    .eq("id", skuId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const sku = data as SkuWithBaseUnit | null

  if (!sku || !sku.is_active) {
    throw new UnitConversionError(
      "SKU_INACTIVE_OR_MISSING",
      "SKU was not found or is inactive."
    )
  }

  const baseUnit = Array.isArray(sku.inv_units) ? sku.inv_units[0] : sku.inv_units
  if (!sku.unit_id || !baseUnit) {
    throw new UnitConversionError(
      "MISSING_BASE_UNIT",
      "SKU does not have a base unit."
    )
  }

  return {
    id: baseUnit.id,
    name: baseUnit.name,
    abbreviation: baseUnit.abbreviation,
  }
}

async function getUnitsById(
  supabase: SupabaseClient,
  unitIds: string[]
): Promise<Map<string, UnitConversionUnit>> {
  const uniqueUnitIds = [...new Set(unitIds)]
  if (uniqueUnitIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from("inv_units")
    .select("id, name, abbreviation")
    .in("id", uniqueUnitIds)

  if (error) throw new Error(error.message)

  return new Map(
    ((data ?? []) as UnitConversionUnit[]).map((unit) => [
      unit.id,
      {
        id: unit.id,
        name: unit.name,
        abbreviation: unit.abbreviation,
      },
    ])
  )
}

async function getConversionRowsBetween(
  supabase: SupabaseClient,
  fromUnitId: string,
  toUnitId: string
): Promise<UnitConversionRow[]> {
  const { data, error } = await supabase
    .from("inv_unit_conversions")
    .select("id, from_unit_id, to_unit_id, factor")
    .in("from_unit_id", [fromUnitId, toUnitId])
    .in("to_unit_id", [fromUnitId, toUnitId])
    .order("created_at", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as UnitConversionRow[]
}
