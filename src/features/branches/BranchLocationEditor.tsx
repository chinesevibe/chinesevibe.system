"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import type { BranchDetail } from "@/features/branches/branch-hub-data"
import { validateBranchCode } from "@/lib/branches/branch-code"
import { isHeadOfficeBranchCode } from "@/lib/branches/head-office"
import { GEOFENCE_MAX_RADIUS_M } from "@/lib/geofence/validate"

function parseCoord(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function osmEmbedUrl(lat: number, lng: number): string {
  const delta = 0.003
  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ].join(",")
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`
}

export function BranchLocationEditor({ branch }: { branch: BranchDetail }) {
  const router = useRouter()
  const headOffice = isHeadOfficeBranchCode(branch.code)
  const [name, setName] = useState(branch.name)
  const [code, setCode] = useState(branch.code ?? "")
  const [address, setAddress] = useState(branch.address ?? "")
  const [latitude, setLatitude] = useState(
    branch.latitude != null ? String(branch.latitude) : ""
  )
  const [longitude, setLongitude] = useState(
    branch.longitude != null ? String(branch.longitude) : ""
  )
  const [geofenceEnabled, setGeofenceEnabled] = useState(
    branch.geofence_enabled !== false
  )
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const latNum = parseCoord(latitude)
  const lngNum = parseCoord(longitude)
  const mapUrl = useMemo(() => {
    if (latNum == null || lngNum == null) return null
    return osmEmbedUrl(latNum, lngNum)
  }, [latNum, lngNum])

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง")
      return
    }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(7))
        setLongitude(pos.coords.longitude.toFixed(7))
        setLocating(false)
      },
      () => {
        setError("ไม่สามารถอ่านตำแหน่งได้ — กรุณาอนุญาตการเข้าถึงตำแหน่ง")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)

    const lat = parseCoord(latitude)
    const lng = parseCoord(longitude)
    if ((lat != null && lng == null) || (lat == null && lng != null)) {
      setError("กรุณาระบุทั้ง Latitude และ Longitude หรือเว้นว่างทั้งคู่")
      setBusy(false)
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("กรุณาระบุชื่อสาขา")
      setBusy(false)
      return
    }

    if (!headOffice) {
      const codeError = validateBranchCode(code)
      if (codeError) {
        setError(codeError)
        setBusy(false)
        return
      }
    }

    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          ...(!headOffice ? { code: code.trim() } : {}),
          address: address.trim() || null,
          latitude: lat,
          longitude: lng,
          ...(headOffice
            ? {}
            : {
                geofence_enabled: geofenceEnabled,
                geofence_radius_m: GEOFENCE_MAX_RADIUS_M,
              }),
        }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string }
      if (!res.ok) throw new Error(data?.error ?? "บันทึกไม่สำเร็จ")
      setMessage("บันทึกข้อมูลสาขาแล้ว")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-3 border-t border-border/60 pt-3">
      <div className="grid max-w-xl gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          ชื่อสาขา
          <input
            type="text"
            required
            className="mt-1 block h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          รหัสสาขา
          <input
            type="text"
            required
            readOnly={headOffice}
            className="mt-1 block h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted/40"
            value={headOffice ? "000" : code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="001"
          />
        </label>
      </div>

      <label className="block text-xs font-medium text-muted-foreground">
        ที่อยู่สาขา
        <textarea
          rows={2}
          className="mt-1 block w-full max-w-xl rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="เลขที่ ถนน แขวง/ตำบล ฯลฯ"
        />
      </label>

      <div className="grid max-w-xl gap-2 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Latitude
          <input
            type="text"
            inputMode="decimal"
            className="mt-1 block h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="13.7563310"
          />
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Longitude
          <input
            type="text"
            inputMode="decimal"
            className="mt-1 block h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="100.5017620"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={locating}
          onClick={useCurrentLocation}
        >
          {locating ? "กำลังอ่านตำแหน่ง..." : "ใช้ตำแหน่งปัจจุบัน"}
        </Button>
        {headOffice ? (
          <p className="text-xs text-muted-foreground">
            Head Office (000) — ไม่ใช้ Geofence สำหรับเช็คอิน/เช็คเอาท์
          </p>
        ) : (
          <>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={geofenceEnabled}
                onChange={(e) => setGeofenceEnabled(e.target.checked)}
                className="size-4 rounded border-input"
              />
              เปิด Geofence
            </label>
            <span className="text-xs text-muted-foreground">
              รัศมี {GEOFENCE_MAX_RADIUS_M} เมตร (คงที่)
            </span>
          </>
        )}
      </div>

      {mapUrl ? (
        <div className="max-w-xl overflow-hidden rounded-lg border border-border/80">
          <iframe
            title="แผนที่ตำแหน่งสาขา"
            src={mapUrl}
            className="h-48 w-full border-0"
            loading="lazy"
          />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          กรอกพิกัดเพื่อดูตัวอย่างบนแผนที่
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          บันทึกข้อมูลสาขา
        </Button>
        {message ? <span className="text-xs text-green-600">{message}</span> : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </form>
  )
}
