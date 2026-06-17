"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  consumeByRecipe,
  createBomLine,
  deleteBomLine,
  type InvBomRow,
} from "@/features/inventory/actions/bom"
import { InventoryFormField } from "@/features/inventory/InventoryFormFields"
import { invInputClass } from "@/features/inventory/form-styles"
import type { InvInventoryCreateOptions } from "@/features/inventory/types"

export function BomManagementPanel({
  rows,
  options,
}: {
  rows: InvBomRow[]
  options: InvInventoryCreateOptions
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [finishedSkuId, setFinishedSkuId] = useState("")
  const [ingredientSkuId, setIngredientSkuId] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [recipeBranchId, setRecipeBranchId] = useState("")
  const [recipeWarehouseId, setRecipeWarehouseId] = useState("")
  const [recipeQty, setRecipeQty] = useState("1")

  const recipeWarehouses = recipeBranchId
    ? options.warehouses.filter((w) => w.branch_id === recipeBranchId)
    : options.warehouses

  function addLine() {
    setError(null)
    startTransition(async () => {
      const result = await createBomLine({
        sku_id: finishedSkuId,
        ingredient_sku_id: ingredientSkuId,
        quantity: Number(quantity),
      })
      if (!result.success) {
        setError(result.error ?? "เพิ่มสูตรไม่สำเร็จ")
        return
      }
      router.refresh()
    })
  }

  function removeLine(id: string) {
    startTransition(async () => {
      await deleteBomLine(id)
      router.refresh()
    })
  }

  function runRecipe() {
    setError(null)
    startTransition(async () => {
      const result = await consumeByRecipe({
        branch_id: recipeBranchId,
        warehouse_id: recipeWarehouseId,
        sku_id: finishedSkuId,
        qty: Number(recipeQty),
      })
      if (!result.success) {
        setError(result.error ?? "ตัดตามสูตรไม่สำเร็จ")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-3">
        <InventoryFormField label="สินค้าสำเร็จรูป (BOM header)">
          <select className={invInputClass} value={finishedSkuId} onChange={(e) => setFinishedSkuId(e.target.value)}>
            <option value="" disabled>เลือก SKU</option>
            {options.skus.map((sku) => (
              <option key={sku.id} value={sku.id}>{sku.code} — {sku.name}</option>
            ))}
          </select>
        </InventoryFormField>
        <InventoryFormField label="วัตถุดิบ">
          <select className={invInputClass} value={ingredientSkuId} onChange={(e) => setIngredientSkuId(e.target.value)}>
            <option value="" disabled>เลือก SKU</option>
            {options.skus.map((sku) => (
              <option key={sku.id} value={sku.id}>{sku.code} — {sku.name}</option>
            ))}
          </select>
        </InventoryFormField>
        <InventoryFormField label="ปริมาณต่อ 1 หน่วย">
          <input className={invInputClass} type="number" min={0.001} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </InventoryFormField>
        <div className="md:col-span-3">
          <Button type="button" disabled={pending || !finishedSkuId || !ingredientSkuId} onClick={addLine}>
            เพิ่มบรรทัดสูตร
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2">สินค้าสำเร็จรูป</th>
              <th className="px-3 py-2">วัตถุดิบ</th>
              <th className="px-3 py-2 text-right">ปริมาณ</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-3 py-2">{row.finished_code} — {row.finished_name}</td>
                <td className="px-3 py-2">{row.ingredient_code} — {row.ingredient_name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                <td className="px-3 py-2 text-right">
                  <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => removeLine(row.id)}>
                    ลบ
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  ยังไม่มีสูตร BOM — เพิ่มบรรทัดด้านบน
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 rounded-xl border border-border p-4 md:grid-cols-4">
        <InventoryFormField label="สาขา (ตัดตามสูตร)">
          <select className={invInputClass} value={recipeBranchId} onChange={(e) => { setRecipeBranchId(e.target.value); setRecipeWarehouseId("") }}>
            <option value="" disabled>เลือกสาขา</option>
            {options.branches.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
          </select>
        </InventoryFormField>
        <InventoryFormField label="คลัง">
          <select className={invInputClass} value={recipeWarehouseId} onChange={(e) => setRecipeWarehouseId(e.target.value)}>
            <option value="" disabled>เลือกคลัง</option>
            {recipeWarehouses.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}
          </select>
        </InventoryFormField>
        <InventoryFormField label="จำนวนสำเร็จรูป">
          <input className={invInputClass} type="number" min={0.001} step="any" value={recipeQty} onChange={(e) => setRecipeQty(e.target.value)} />
        </InventoryFormField>
        <div className="flex items-end">
          <Button type="button" disabled={pending || !finishedSkuId || !recipeBranchId || !recipeWarehouseId} onClick={runRecipe}>
            ตัดตามสูตร (FEFO)
          </Button>
        </div>
      </div>
    </div>
  )
}
