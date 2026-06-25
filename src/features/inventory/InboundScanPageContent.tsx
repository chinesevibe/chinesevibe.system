"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { Tabs } from "@base-ui/react/tabs"
import { Barcode, CheckCircle2, Trash2 } from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  deleteMobileInvInboundItem,
  getInvSkuUnitOptionsByBarcode,
  listMobileInvInboundItems,
  scanInvInboundItem,
} from "@/features/inventory/actions/inbound"
import { InboundBarcodeScanner } from "@/features/inventory/InboundBarcodeScanner"
import type { InvInboundItemRow } from "@/features/inventory/types"
import {
  initInboundScanLiff,
  isLikelyLineBrowser,
} from "@/lib/line/liff-client"
import { readInboundOrderId } from "@/lib/line/inbound-order-id"
import { useLocale } from "@/features/portal/LocaleProvider"
import { cn } from "@/lib/utils"

type LookupUnit = {
  id: string
  name: string
  abbreviation?: string | null
  factorToBase?: number
  factor_to_base?: number
}

type LookupSku = {
  id?: string
  code: string
  name: string
  unit_id?: string | null
  base_unit?: LookupUnit | null
  unit?: LookupUnit | null
  units?: LookupUnit[]
  unit_options?: LookupUnit[]
}

function unitLabel(unit: LookupUnit) {
  return unit.abbreviation || unit.name
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)))
}

function factorToBase(unit: LookupUnit) {
  const factor = unit.factorToBase ?? unit.factor_to_base ?? 1
  return Number.isFinite(factor) && factor > 0 ? factor : 1
}

function unitOptionsForSku(sku: LookupSku | null) {
  if (!sku) return []
  const rawOptions = sku.unit_options ?? sku.units ?? []
  const baseUnit = sku.base_unit ?? sku.unit ?? rawOptions.find((unit) => unit.id === sku.unit_id)
  const options = baseUnit ? [baseUnit, ...rawOptions] : rawOptions
  const unique = new Map<string, LookupUnit>()

  for (const option of options) {
    if (!option.id) continue
    unique.set(option.id, option)
  }

  return Array.from(unique.values())
}

function useInboundOrderId(pathOrderId?: string): {
  orderId: string
  resolving: boolean
} {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const initialPathOrderId = pathOrderId?.trim() ?? ""
  const initialClientOrderId =
    typeof window === "undefined"
      ? ""
      : readInboundOrderId(window.location.search, window.location.pathname)
  const [orderId, setOrderId] = useState(
    initialPathOrderId || initialClientOrderId
  )
  const [resolving, setResolving] = useState(
    initialPathOrderId || initialClientOrderId
      ? false
      : typeof window === "undefined"
        ? true
        : isLikelyLineBrowser()
  )

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      if (pathOrderId?.trim()) {
        setOrderId(pathOrderId.trim())
        setResolving(false)
        return
      }

      const read = () =>
        readInboundOrderId(
          typeof window !== "undefined"
            ? window.location.search
            : searchParams.toString(),
          typeof window !== "undefined" ? window.location.pathname : pathname
        )

      let id =
        readInboundOrderId(searchParams.toString(), pathname) || read()

      if (!id && !isLikelyLineBrowser()) {
        if (!cancelled) {
          setOrderId("")
          setResolving(false)
        }
        return
      }

      if (!id && isLikelyLineBrowser()) {
        await Promise.race([
          initInboundScanLiff(),
          new Promise((resolveTimeout) => window.setTimeout(resolveTimeout, 1500)),
        ])
        id = read()
      }

      if (!cancelled) {
        setOrderId(id)
        setResolving(false)
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [pathOrderId, pathname, searchParams])

  return { orderId, resolving }
}

export function InboundScanPageContent({
  pathOrderId,
}: {
  pathOrderId?: string
}) {
  const { tx } = useLocale()
  const searchParams = useSearchParams()
  const { orderId, resolving } = useInboundOrderId(pathOrderId)
  const quantityRef = useRef<HTMLInputElement | null>(null)
  const [barcode, setBarcode] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [selectedUnitId, setSelectedUnitId] = useState("")
  const [lot, setLot] = useState("")
  const [expiry, setExpiry] = useState("")
  const [lookup, setLookup] = useState<LookupSku | null>(null)
  const [quickSave, setQuickSave] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageVisible, setMessageVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<InvInboundItemRow[]>([])
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [loadingItems, setLoadingItems] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const loadItems = useCallback(async () => {
    if (!orderId) return
    setLoadingItems(true)
    setItemsError(null)
    try {
      const result = await listMobileInvInboundItems(orderId)
      if (result.success) {
        setItems(result.items ?? [])
      } else {
        setItemsError(result.error ?? tx("liff.inbound.errorLoad"))
      }
    } catch {
      setItemsError(tx("liff.inbound.errorLoadConnection"))
    } finally {
      setLoadingItems(false)
    }
  }, [orderId, tx])

  const showMessage = useCallback((text: string) => {
    setMessage(text)
    setMessageVisible(true)
  }, [])

  const lookupBarcodeValue = useCallback(async (value: string) => {
    setError(null)
    setLookup(null)
    const trimmed = value.trim()
    if (!trimmed) return null

    let result: Awaited<ReturnType<typeof getInvSkuUnitOptionsByBarcode>>
    try {
      result = await getInvSkuUnitOptionsByBarcode({ barcode: trimmed })
    } catch {
      setError(tx("liff.inbound.errorSearchConnection"))
      return null
    }

    if (!result.success || !result.sku) {
      setError(result.error ?? tx("liff.inbound.errorSkuNotFound"))
      return null
    }

    const optionUnits = (result.options ?? []).map((option) => ({
      id: option.id,
      name: option.name,
      abbreviation: option.abbreviation,
      factorToBase: option.factorToBaseUnit,
    }))
    const baseOption = result.options?.find((option) => option.isBaseUnit)
    const sku: LookupSku = {
      ...result.sku,
      unit_id: baseOption?.id ?? optionUnits[0]?.id ?? null,
      base_unit: baseOption
        ? {
            id: baseOption.id,
            name: baseOption.name,
            abbreviation: baseOption.abbreviation,
            factorToBase: baseOption.factorToBaseUnit,
          }
        : optionUnits[0] ?? null,
      unit_options: optionUnits,
    }

    setLookup(sku)
    const options = unitOptionsForSku(sku)
    setSelectedUnitId(
      sku.unit_id ??
        sku.base_unit?.id ??
        sku.unit?.id ??
        options[0]?.id ??
        ""
    )
    return sku
  }, [tx])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadItems()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadItems])

  useEffect(() => {
    if (!message) return
    const fadeTimeout = window.setTimeout(() => {
      setMessageVisible(false)
    }, 1700)
    const clearTimeout = window.setTimeout(() => {
      setMessage(null)
    }, 2000)
    return () => {
      window.clearTimeout(fadeTimeout)
      window.clearTimeout(clearTimeout)
    }
  }, [message])

  const submit = useCallback(
    (override?: {
      barcode?: string
      quantity?: string
      skuCode?: string
      unitId?: string
    }) => {
      setMessage(null)
      setMessageVisible(false)
      setError(null)

      if (!orderId) {
        setError(tx("liff.inbound.errorNoOrder"))
        return
      }

      const nextBarcode = override?.barcode ?? barcode
      const nextQuantity = override?.quantity ?? quantity
      const qty = Number(nextQuantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(tx("liff.inbound.errorInvalidQuantity"))
        return
      }

      const nextUnitId = override?.unitId ?? selectedUnitId
      startTransition(async () => {
        let result: Awaited<ReturnType<typeof scanInvInboundItem>>
        try {
          const payload = {
            order_id: orderId,
            barcode: nextBarcode.trim(),
            quantity: qty,
            lot_number: lot.trim() || null,
            expiry_date: expiry || null,
            ...(nextUnitId ? { unit_id: nextUnitId } : {}),
          } as Parameters<typeof scanInvInboundItem>[0] & { unit_id?: string }
          result = await scanInvInboundItem(payload)
        } catch {
          setError(tx("liff.inbound.errorSaveConnection"))
          return
        }

        if (result.success) {
          showMessage(
            tx("liff.inbound.saved", {
              skuCode: override?.skuCode ?? lookup?.code ?? nextBarcode,
            })
          )
          setBarcode("")
          setQuantity("1")
          setSelectedUnitId("")
          setLot("")
          setExpiry("")
          setLookup(null)
          await loadItems()
        } else {
          setError(result.error ?? tx("liff.inbound.errorSave"))
        }
      })
    },
    [
      barcode,
      expiry,
      loadItems,
      lookup?.code,
      lot,
      orderId,
      quantity,
      selectedUnitId,
      showMessage,
      tx,
    ]
  )

  const handleScanned = useCallback(
    (value: string) => {
      setBarcode(value)
      void (async () => {
        const sku = await lookupBarcodeValue(value)
        if (sku && quickSave && Number(quantity) === 1) {
          const options = unitOptionsForSku(sku)
          submit({
            barcode: value,
            quantity: "1",
            skuCode: sku.code,
            unitId:
              sku.unit_id ?? sku.base_unit?.id ?? sku.unit?.id ?? options[0]?.id,
          })
          return
        }
        window.requestAnimationFrame(() => quantityRef.current?.focus())
      })()
    },
    [lookupBarcodeValue, quantity, quickSave, submit]
  )

  useEffect(() => {
    const value = searchParams.get("barcode")?.trim()
    if (!value) return
    const timeout = window.setTimeout(() => handleScanned(value), 0)
    return () => window.clearTimeout(timeout)
  }, [handleScanned, searchParams])

  async function lookupBarcode() {
    await lookupBarcodeValue(barcode)
  }

  const lookupUnitOptions = unitOptionsForSku(lookup)
  const selectedUnit =
    lookupUnitOptions.find((unit) => unit.id === selectedUnitId) ??
    lookupUnitOptions[0]
  const baseUnit =
    lookup?.base_unit ??
    lookup?.unit ??
    lookupUnitOptions.find((unit) => unit.id === lookup?.unit_id) ??
    lookupUnitOptions[0]
  const selectedFactor = selectedUnit ? factorToBase(selectedUnit) : 1

  async function deleteItem(item: InvInboundItemRow) {
    if (
      !window.confirm(
        tx("liff.inbound.confirmDelete", {
          skuCode: item.sku_code,
          quantity: item.quantity,
        })
      )
    ) {
      return
    }

    setDeletingId(item.id)
    setError(null)
    setMessage(null)
    setMessageVisible(false)
    try {
      const result = await deleteMobileInvInboundItem(item.id, orderId)
      if (result.success) {
        showMessage(tx("liff.inbound.deleted", { skuCode: item.sku_code }))
        await loadItems()
      } else {
        setError(result.error ?? tx("liff.inbound.errorDelete"))
      }
    } catch {
      setError(tx("liff.inbound.errorDeleteConnection"))
    } finally {
      setDeletingId(null)
    }
  }

  if (resolving) {
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-sm text-muted-foreground">
          {tx("liff.inbound.loadingOrder")}
        </CardContent>
      </Card>
    )
  }

  if (!orderId) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{tx("liff.inbound.missingTitle")}</CardTitle>
          <CardDescription className="leading-relaxed">
            {tx("liff.inbound.missingDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/portal/inbound"
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            {tx("liff.inbound.goInventory")}
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex w-full min-w-0 items-center gap-2">
          <Barcode className="size-5 text-brand-red" />
          {tx("liff.inbound.title")}
        </CardTitle>
        <CardDescription>
          {tx("liff.inbound.orderLabel")}{" "}
          <span className="font-mono text-xs">{orderId.slice(0, 8)}…</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <div
            className={cn(
              "fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-opacity duration-300",
              messageVisible ? "opacity-100" : "opacity-0"
            )}
          >
            <CheckCircle2 className="size-4" />
            {message}
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Tabs.Root defaultValue="scan" className="space-y-4">
          <Tabs.List className="grid grid-cols-2 rounded-lg bg-muted p-1">
            <Tabs.Tab
              value="scan"
              className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm"
            >
              {tx("liff.inbound.scanTab")}
            </Tabs.Tab>
            <Tabs.Tab
              value="items"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm"
            >
              {tx("liff.inbound.itemsTab")}
              <Badge variant="secondary">{items.length}</Badge>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="scan" keepMounted className="space-y-4">
            <InboundBarcodeScanner onScanned={handleScanned} disabled={pending} />

            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 rounded border-input accent-primary"
                checked={quickSave}
                onChange={(event) => setQuickSave(event.target.checked)}
              />
              {tx("liff.inbound.quickSave")}
            </label>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="barcode">
                {tx("liff.inbound.barcodeLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  id="barcode"
                  className="h-10 flex-1 rounded-lg border border-input px-3 text-sm"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  onBlur={() => void lookupBarcode()}
                  placeholder={tx("liff.inbound.barcodePlaceholder")}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void lookupBarcode()}
                >
                  {tx("liff.inbound.search")}
                </Button>
              </div>
              {lookup ? (
                <p className="text-sm text-muted-foreground">
                  {lookup.code} — {lookup.name}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="qty">
                  {tx("liff.inbound.quantity")}
                </label>
                <input
                  id="qty"
                  ref={quantityRef}
                  type="number"
                  min={0.001}
                  step="any"
                  className="h-10 w-full rounded-lg border border-input px-3 text-sm"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>
              {lookupUnitOptions.length > 0 ? (
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="unit_id">
                    {tx("liff.inbound.unit")}
                  </label>
                  <select
                    id="unit_id"
                    className="h-10 w-full rounded-lg border border-input px-3 text-sm"
                    value={selectedUnitId}
                    onChange={(event) => setSelectedUnitId(event.target.value)}
                  >
                    {lookupUnitOptions.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                        {unit.abbreviation ? ` (${unit.abbreviation})` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedUnit && baseUnit && selectedUnit.id !== baseUnit.id ? (
                    <p className="text-xs text-muted-foreground">
                      1 {unitLabel(selectedUnit)} = {formatNumber(selectedFactor)}{" "}
                      {unitLabel(baseUnit)}
                    </p>
                  ) : baseUnit ? (
                    <p className="text-xs text-muted-foreground">
                      {tx("liff.inbound.baseUnit", { unit: unitLabel(baseUnit) })}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="lot">
                  Lot
                </label>
                <input
                  id="lot"
                  className="h-10 w-full rounded-lg border border-input px-3 text-sm"
                  value={lot}
                  onChange={(event) => setLot(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="expiry">
                {tx("liff.inbound.expiry")}
              </label>
              <input
                id="expiry"
                type="date"
                className="h-10 w-full rounded-lg border border-input px-3 text-sm"
                value={expiry}
                onChange={(event) => setExpiry(event.target.value)}
              />
            </div>

            <Button className="w-full" disabled={pending} onClick={() => submit()}>
              {pending ? tx("liff.inbound.saving") : tx("liff.inbound.save")}
            </Button>
          </Tabs.Panel>

          <Tabs.Panel value="items" keepMounted className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{tx("liff.inbound.itemsTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {tx("liff.inbound.itemsDesc")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loadingItems}
                onClick={() => void loadItems()}
              >
                {tx("liff.inbound.refresh")}
              </Button>
            </div>

            {itemsError ? (
              <p className="text-sm text-destructive">{itemsError}</p>
            ) : null}
            {loadingItems && items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tx("liff.inbound.loadingItems")}
              </p>
            ) : null}
            {!loadingItems && items.length === 0 && !itemsError ? (
              <p className="text-sm text-muted-foreground">
                {tx("liff.inbound.emptyItems")}
              </p>
            ) : null}

            {items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.sku_code} — {item.sku_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx("liff.inbound.itemQuantity", {
                          quantity: item.quantity,
                        })}
                        {item.lot_number ? ` · Lot ${item.lot_number}` : ""}
                        {item.expiry_date ? ` · Exp ${item.expiry_date}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-destructive"
                      disabled={deletingId === item.id}
                      onClick={() => void deleteItem(item)}
                    >
                      <Trash2 className="size-4" />
                      {tx("liff.inbound.delete")}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Tabs.Panel>
        </Tabs.Root>
      </CardContent>
    </Card>
  )
}
