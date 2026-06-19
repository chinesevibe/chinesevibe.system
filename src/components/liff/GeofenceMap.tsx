"use client"

import { useEffect, useRef } from "react"

export interface GeofenceMapProps {
  officeLat: number
  officeLng: number
  geofenceRadiusM: number
  officeName?: string
  userLat?: number
  userLng?: number
  accuracyM?: number
  distanceM?: number
  className?: string
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any
  }
}

/** Haversine distance in metres */
export function haversineM(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function GeofenceMap({
  officeLat,
  officeLng,
  geofenceRadiusM,
  officeName = "จุดพิกัดเข้างาน",
  userLat,
  userLng,
  accuracyM,
  distanceM,
  className = "",
}: GeofenceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accuracyCircleRef = useRef<any>(null)

  // Initialise map (once)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    function initMap() {
      const L = window.L
      if (!L || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [officeLat, officeLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map)

      // Office marker (red pin)
      const officeIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:40px;height:40px">
          <div style="position:absolute;inset:0;background:#E80012;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;padding-bottom:4px">🏢</div>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 38],
      })
      L.marker([officeLat, officeLng], { icon: officeIcon })
        .addTo(map)
        .bindPopup(officeName)

      // Geofence circle (dashed red)
      L.circle([officeLat, officeLng], {
        radius: geofenceRadiusM,
        color: "#E80012",
        fillColor: "#E80012",
        fillOpacity: 0.08,
        weight: 2,
        dashArray: "6 4",
      }).addTo(map)

      mapRef.current = map
    }

    function loadLeaflet() {
      if (window.L) { initMap(); return }

      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      if (!document.querySelector('script[src*="leaflet"]')) {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        script.onload = initMap
        document.head.appendChild(script)
      } else {
        const interval = setInterval(() => {
          if (window.L) { clearInterval(interval); initMap() }
        }, 100)
      }
    }

    loadLeaflet()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        userMarkerRef.current = null
        accuracyCircleRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update user marker when position changes
  useEffect(() => {
    const L = window.L
    const map = mapRef.current
    if (!L || !map || userLat === undefined || userLng === undefined) return

    const userIcon = L.divIcon({
      className: "",
      html: `<div style="width:18px;height:18px;background:#2563EB;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.25)"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng])
    } else {
      userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .addTo(map)
    }

    if (accuracyM && accuracyM > 0) {
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current
          .setLatLng([userLat, userLng])
          .setRadius(accuracyM)
      } else {
        accuracyCircleRef.current = L.circle([userLat, userLng], {
          radius: accuracyM,
          color: "#2563EB",
          fillColor: "#2563EB",
          fillOpacity: 0.06,
          weight: 1,
        }).addTo(map)
      }
    }

    // Fit bounds to show both office + user
    const bounds = L.latLngBounds(
      [officeLat, officeLng],
      [userLat, userLng]
    ).pad(0.35)
    map.fitBounds(bounds, { animate: true, duration: 0.5 })
  }, [userLat, userLng, accuracyM, officeLat, officeLng])

  const isInside =
    distanceM !== undefined && distanceM <= geofenceRadiusM

  return (
    <div className={`relative overflow-hidden rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {/* Map tile */}
      <div
        ref={containerRef}
        style={{ height: 240, background: "#e5e3df" }}
      />

      {/* Radius label */}
      <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-[#E80012] px-3 py-1 text-xs font-medium text-white shadow">
        วงระยะอนุญาต {geofenceRadiusM} เมตร
      </div>

      {/* Distance badge */}
      {distanceM !== undefined && (
        <div
          className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-md ${
            isInside ? "bg-green-600" : "bg-[#E80012]"
          }`}
        >
          {isInside ? "✓" : "✕"}{" "}
          {Math.round(distanceM)} เมตร
          {accuracyM ? ` (±${Math.round(accuracyM)}ม.)` : ""}
        </div>
      )}

      {/* Locating spinner overlay */}
      {userLat === undefined && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-4 py-1.5 text-xs text-white backdrop-blur-sm">
          🔍 กำลังหาพิกัด...
        </div>
      )}
    </div>
  )
}
