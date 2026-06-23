import { AdminPageShell } from "@/components/brand/AdminPageShell"
import { DataTableShell } from "@/components/brand/DataTableShell"
import { StatusPill } from "@/components/brand/StatusPill"
import { AlertTriangle, Boxes, PackageSearch, ScanSearch } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getInvBranches } from "@/features/inventory/actions/branch"
import { getInvWarehousesWithBranch } from "@/features/inventory/actions/warehouse"
import { InventoryLoadError } from "@/features/inventory/InventorySearchBar"
import { listInvStockRows } from "@/features/inventory/stock-data"
import { listInvStockLotRows } from "@/features/inventory/stock-lot-data"
import { StockFilters } from "@/features/inventory/StockFilters"
import { isCeo, isDev } from "@/lib/auth/roles"
import { requireInventoryPortal } from "@/lib/auth/require-inventory-portal"

type PageProps = {
  searchParams?: Promise<{
    search?: string
    branch_id?: string
    warehouse_id?: string
    below_min?: string
    expiring?: string
  }>
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof AlertTriangle
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString("th-TH")}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-brand-red">
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  )
}

export default async function InventoryStockPage({ searchParams }: PageProps) {
  const employee = await requireInventoryPortal()
  const readOnly = isCeo(employee.role) && !isDev(employee.role)

  const params = await searchParams
  const search = params?.search ?? ""
  const branchId = params?.branch_id ?? ""
  const warehouseId = params?.warehouse_id ?? ""
  const belowMinOnly = params?.below_min === "1"
  const expiringOnly = params?.expiring === "1"

  let loadError: string | null = null
  let rows: Awaited<ReturnType<typeof listInvStockRows>> = []
  let lotRows: Awaited<ReturnType<typeof listInvStockLotRows>> = []
  let branches: Awaited<ReturnType<typeof getInvBranches>> = []
  let warehouses: Awaited<ReturnType<typeof getInvWarehousesWithBranch>> = []

  try {
    ;[rows, lotRows, branches, warehouses] = await Promise.all([
      listInvStockRows({
        search,
        branchId: branchId || undefined,
        warehouseId: warehouseId || undefined,
        belowMinOnly,
      }),
      listInvStockLotRows({
        search,
        branchId: branchId || undefined,
        warehouseId: warehouseId || undefined,
        expiringOnly,
      }),
      getInvBranches(),
      getInvWarehousesWithBranch(),
    ])
  } catch (error) {
    loadError = error instanceof Error ? error.message : "โหลดข้อมูลสต็อกไม่สำเร็จ"
  }

  const zeroStockCount = rows.filter((row) => row.quantity === 0).length
  const belowMinCount = rows.filter((row) => row.belowMin).length
  const activeLotCount = lotRows.length
  const expiringSoonCount = lotRows.filter((row) => {
    if (!row.expiryDate) return false
    const diffMs =
      Date.parse(`${row.expiryDate}T00:00:00Z`) - Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`)
    return diffMs >= 0 && diffMs <= 7 * 86_400_000
  }).length

  function lotStatusPill(status: string) {
    if (status === "expired") return <StatusPill label="หมดอายุ" variant="rejected" />
    if (status === "reserved") return <StatusPill label="จองแล้ว" variant="pending" />
    return <StatusPill label={status} variant="approved" />
  }

  function stockStatusPill(quantity: number, minStock: number) {
    if (quantity === 0) return <StatusPill label="หมด" variant="rejected" />
    if (minStock > 0 && quantity < minStock) {
      return <StatusPill label="ต่ำกว่า Min" variant="pending" />
    }
    return <StatusPill label="ปกติ" variant="approved" />
  }

  return (
    <AdminPageShell
      title="สต็อกคงเหลือ"
      description={
        readOnly
          ? "ดูยอดสต็อกตาม SKU และคลัง (read-only)"
          : "แยกดู on-hand และ lot/FEFO ให้ชัดขึ้น เพื่อตัดสินใจเติมสต็อกและไล่ lot ได้เร็วขึ้น"
      }
    >
      {loadError ? <InventoryLoadError message={loadError} /> : null}

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Boxes}
          label="SKU ในขอบเขต"
          value={rows.length}
          hint="จำนวนแถวคงเหลือที่ตรงกับตัวกรองปัจจุบัน"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="ต่ำกว่า Min"
          value={belowMinCount}
          hint="SKU ที่ควรเติมสต็อกหรือตรวจ branch/warehouse ต่อ"
        />
        <SummaryCard
          icon={PackageSearch}
          label="คงเหลือเป็น lot"
          value={activeLotCount}
          hint="lot ที่ยังมีของเหลือให้ไล่ต่อใน FEFO section"
        />
        <SummaryCard
          icon={ScanSearch}
          label="ใกล้หมดอายุ 7 วัน"
          value={expiringSoonCount}
          hint="lot ที่ควรเร่งใช้ก่อนหรือดันออกก่อนหมดอายุ"
        />
      </div>

      <StockFilters
        branches={branches}
        warehouses={warehouses}
        search={search}
        branchId={branchId}
        warehouseId={warehouseId}
        belowMinOnly={belowMinOnly}
        expiringOnly={expiringOnly}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">On-hand by SKU</h2>
            <p className="text-xs text-muted-foreground">
              ใช้ section นี้ดูยอดคงเหลือรวมตาม SKU ก่อน แล้วค่อยไล่ lot และ expiry ด้านล่าง
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            หมด {zeroStockCount.toLocaleString("th-TH")} · ต่ำกว่า Min {belowMinCount.toLocaleString("th-TH")}
          </div>
        </div>
        <div className="grid gap-3 md:hidden">
          {rows.length > 0 ? (
            rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{row.skuCode}</p>
                    <p className="text-sm text-muted-foreground">{row.skuName}</p>
                  </div>
                  {stockStatusPill(row.quantity, row.minStock)}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">คงเหลือ</p>
                    <p className="text-lg font-semibold tabular-nums">{row.quantity}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">Min</p>
                    <p className="text-lg font-semibold tabular-nums">{row.minStock}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">สาขา:</span> {row.branchName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">คลัง:</span> {row.warehouseName} ({row.warehouseCode})
                  </p>
                  {row.barcode ? (
                    <p className="truncate">
                      <span className="text-muted-foreground">Barcode:</span> {row.barcode}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              {belowMinOnly
                ? "ไม่พบ SKU ที่ต่ำกว่า Min"
                : "ยังไม่มีข้อมูลสต็อก — รับเข้าสินค้าเพื่อเริ่มใช้งาน"}
            </div>
          )}
        </div>
        <div className="hidden md:block">
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>สาขา</TableHead>
                  <TableHead>คลัง</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead className="text-right">Min</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.skuCode}</TableCell>
                      <TableCell>{row.skuName}</TableCell>
                      <TableCell>{row.branchName}</TableCell>
                      <TableCell>
                        {row.warehouseName}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({row.warehouseCode})
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.minStock}</TableCell>
                      <TableCell>{stockStatusPill(row.quantity, row.minStock)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {belowMinOnly
                        ? "ไม่พบ SKU ที่ต่ำกว่า Min"
                        : "ยังไม่มีข้อมูลสต็อก — รับเข้าสินค้าเพื่อเริ่มใช้งาน"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataTableShell>
        </div>
      </section>

      <section id="lot-workspace" className="mt-8 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
          <div>
            <h2 className="text-base font-semibold">Lot / FEFO workspace</h2>
            <p className="text-xs text-muted-foreground">
              ใช้ section นี้ตรวจ lot ที่ยังเหลืออยู่และไล่ expiry ก่อนตัดสินใจโอน ใช้ หรือระบายของ
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            lot คงเหลือ {activeLotCount.toLocaleString("th-TH")} · ใกล้หมดอายุ 7 วัน {expiringSoonCount.toLocaleString("th-TH")}
          </div>
        </div>
        {expiringOnly ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900">
            กำลังกรองเฉพาะ lot ที่ใกล้หมดอายุภายใน 30 วันจากรายการ alerts
          </div>
        ) : null}
        <div className="grid gap-3 md:hidden">
          {lotRows.length > 0 ? (
            lotRows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{row.skuCode}</p>
                    <p className="text-sm text-muted-foreground">Lot {row.lotNumber}</p>
                  </div>
                  {lotStatusPill(row.status)}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">คงเหลือ</p>
                    <p className="text-lg font-semibold tabular-nums">{row.remainingQty}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-[11px] text-muted-foreground">หมดอายุ</p>
                    <p className="text-sm font-semibold">{row.expiryDate ?? "—"}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">สาขา:</span> {row.branchName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">คลัง:</span> {row.warehouseName} ({row.warehouseCode})
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              ยังไม่มี lot คงเหลือ
            </div>
          )}
        </div>
        <div className="hidden md:block">
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>สาขา</TableHead>
                  <TableHead>คลัง</TableHead>
                  <TableHead>หมดอายุ</TableHead>
                  <TableHead className="text-right">คงเหลือ</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lotRows.length > 0 ? (
                  lotRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.skuCode}</TableCell>
                      <TableCell>{row.lotNumber}</TableCell>
                      <TableCell>{row.branchName}</TableCell>
                      <TableCell>
                        {row.warehouseName}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({row.warehouseCode})
                        </span>
                      </TableCell>
                      <TableCell>{row.expiryDate ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.remainingQty}</TableCell>
                      <TableCell>{lotStatusPill(row.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      ยังไม่มี lot คงเหลือ
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DataTableShell>
        </div>
      </section>
    </AdminPageShell>
  )
}
