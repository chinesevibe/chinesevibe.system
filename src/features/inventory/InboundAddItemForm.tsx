"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  InventoryFormField,
  InventoryTextInput,
} from "@/features/inventory/InventoryFormFields"
import { addInvInboundItem } from "@/features/inventory/actions/inbound"
import { invInputClass } from "@/features/inventory/form-styles"
import type { InvSku } from "@/features/inventory/types"

export type InboundUnitOption = {
  id: string
  name: string
  abbreviation: string | null
}

export type InboundSkuUnitOption = {
  unit: InboundUnitOption
  factorToBase: number
}

export type InboundSkuUnitConfig = {
  baseUnit: InboundUnitOption | null
  options: InboundSkuUnitOption[]
}

function unitLabel(unit: InboundUnitOption) {
  return unit.abbreviation || unit.name
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

export function InboundAddItemForm({
  orderId,
  skus,
  unitConfigs,
  disabled,
}: {
  orderId: string
  skus: InvSku[]
  unitConfigs?: Record<string, InboundSkuUnitConfig>
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedSkuId, setSelectedSkuId] = useState("")
  const [selectedUnitId, setSelectedUnitId] = useState("")

  const selectedUnitConfig = selectedSkuId ? unitConfigs?.[selectedSkuId] : undefined
  const selectedUnit =
    selectedUnitConfig?.options.find((option) => option.unit.id === selectedUnitId) ??
    selectedUnitConfig?.options[0]
  const baseUnit = selectedUnitConfig?.baseUnit
  const showUnitSelect = Boolean(selectedUnitConfig?.options.length)
  const showConversion =
    selectedUnit && baseUnit && selectedUnit.unit.id !== baseUnit.id && selectedUnit.factorToBase !== 1

  if (disabled) return null

  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        const formData = new FormData(e.currentTarget)
        const unitOption = selectedUnitId
          ? selectedUnitConfig?.options.find((option) => option.unit.id === selectedUnitId)
          : selectedUnitConfig?.options[0]

        if (unitOption) {
          formData.set("unit_id", unitOption.unit.id)
        }

        startTransition(async () => {
          const result = await addInvInboundItem(orderId, formData)
          if (result.success) {
            e.currentTarget.reset()
            setSelectedSkuId("")
            setSelectedUnitId("")
            router.refresh()
          } else {
            setError(result.error ?? "เพิ่มรายการไม่สำเร็จ")
          }
        })
      }}
    >
      <h3 className="md:col-span-2 text-sm font-semibold">เพิ่มรายการสินค้า</h3>
      <InventoryFormField label="SKU" htmlFor="sku_id">
        <select
          id="sku_id"
          name="sku_id"
          required
          defaultValue=""
          className={invInputClass}
          onChange={(event) => {
            const nextSkuId = event.currentTarget.value
            const nextConfig = unitConfigs?.[nextSkuId]
            setSelectedSkuId(nextSkuId)
            setSelectedUnitId(nextConfig?.baseUnit?.id ?? nextConfig?.options[0]?.unit.id ?? "")
          }}
        >
          <option value="" disabled>
            เลือก SKU
          </option>
          {skus.map((sku) => (
            <option key={sku.id} value={sku.id}>
              {sku.code} — {sku.name}
            </option>
          ))}
        </select>
      </InventoryFormField>
      {showUnitSelect ? (
        <InventoryFormField label="หน่วยรับเข้า" htmlFor="unit_id">
          <select
            id="unit_id"
            name="unit_id"
            required
            value={selectedUnitId}
            className={invInputClass}
            onChange={(event) => setSelectedUnitId(event.currentTarget.value)}
          >
            {selectedUnitConfig?.options.map((option) => (
              <option key={option.unit.id} value={option.unit.id}>
                {option.unit.name}
                {option.unit.abbreviation ? ` (${option.unit.abbreviation})` : ""}
              </option>
            ))}
          </select>
          {showConversion ? (
            <p className="text-xs text-muted-foreground">
              1 {unitLabel(selectedUnit.unit)} = {formatNumber(selectedUnit.factorToBase)}{" "}
              {unitLabel(baseUnit)}
            </p>
          ) : baseUnit ? (
            <p className="text-xs text-muted-foreground">
              บันทึกเป็นหน่วยฐาน: {unitLabel(baseUnit)}
            </p>
          ) : null}
        </InventoryFormField>
      ) : null}
      <InventoryFormField label="จำนวน" htmlFor="quantity">
        <InventoryTextInput
          id="quantity"
          name="quantity"
          type="number"
          min={0.001}
          step="any"
          required
        />
      </InventoryFormField>
      <InventoryFormField label="ต้นทุน/หน่วยฐาน (ไม่บังคับ)" htmlFor="cost_per_unit">
        <InventoryTextInput id="cost_per_unit" name="cost_per_unit" type="number" min={0} step="any" />
      </InventoryFormField>
      <InventoryFormField label="Lot (ไม่บังคับ)" htmlFor="lot_number">
        <InventoryTextInput id="lot_number" name="lot_number" />
      </InventoryFormField>
      <InventoryFormField label="วันหมดอายุ (ไม่บังคับ)" htmlFor="expiry_date">
        <InventoryTextInput id="expiry_date" name="expiry_date" type="date" />
      </InventoryFormField>
      <div className="md:col-span-2 flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "เพิ่มรายการ"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </form>
  )
}
