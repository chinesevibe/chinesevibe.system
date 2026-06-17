"use client"

import { useEffect, useState } from "react"

import { listAvailableLots, type InvStockLotOption } from "@/features/inventory/actions/fefo"
import { invInputClass } from "@/features/inventory/form-styles"

type Props = {
  skuId: string
  warehouseId: string
  value: string
  onChange: (lotId: string, lot?: InvStockLotOption) => void
  disabled?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
}

function formatLotLabel(lot: InvStockLotOption) {
  const expiry = lot.expiry_date ? ` · หมด ${lot.expiry_date}` : ""
  return `${lot.lot_number} (${lot.remaining_qty}${expiry})`
}

export function InventoryLotPicker({
  skuId,
  warehouseId,
  value,
  onChange,
  disabled = false,
  allowEmpty = true,
  emptyLabel = "— FEFO อัตโนมัติ —",
}: Props) {
  const [lots, setLots] = useState<InvStockLotOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!skuId || !warehouseId) {
      setLots([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void listAvailableLots(skuId, warehouseId).then((result) => {
      if (cancelled) return
      if (result.success) {
        setLots(result.lots)
      } else {
        setLots([])
        setError(result.error)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [skuId, warehouseId])

  if (!skuId || !warehouseId) {
    return (
      <p className="text-xs text-muted-foreground">เลือก SKU และคลังก่อน</p>
    )
  }

  return (
    <div className="space-y-1">
      <select
        className={invInputClass}
        value={value}
        disabled={disabled || loading}
        onChange={(event) => {
          const lotId = event.target.value
          const lot = lots.find((row) => row.id === lotId)
          onChange(lotId, lot)
        }}
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {lots.map((lot) => (
          <option key={lot.id} value={lot.id}>
            {formatLotLabel(lot)}
          </option>
        ))}
      </select>
      {loading ? (
        <p className="text-xs text-muted-foreground">กำลังโหลด lot…</p>
      ) : error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : lots.length === 0 ? (
        <p className="text-xs text-muted-foreground">ไม่มี lot คงเหลือในคลังนี้</p>
      ) : null}
    </div>
  )
}
