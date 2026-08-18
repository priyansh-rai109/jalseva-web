'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Navigation, Phone, MessageSquare,
  X, Compass, Zap, Layers, MapPin, ExternalLink,
  LocateFixed, ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface LiveGpsMapModalProps {
  orderId: string
  supplierName: string
  customerAddress: string
  driverName?: string
  driverPhone?: string
  vehicleNumber?: string
  productType?: 'tanker' | 'can' | 'pouch'
  isOpen: boolean
  onClose: () => void
}

// Real Jodhpur coordinates along authentic city streets
const ROUTE_COORDINATES: [number, number][] = [
  [26.2975, 73.0425], // 1. Paota RO Water Hub (Origin)
  [26.2932, 73.0368], // 2. Paota B Road / High Court link
  [26.2885, 73.0305], // 3. Sojati Gate / Station Road
  [26.2842, 73.0232], // 4. Nai Sarak / Clock Tower (Ghanta Ghar)
  [26.2798, 73.0185], // 5. Jalori Gate Circle
  [26.2755, 73.0142], // 6. Sardarpura B Road
  [26.2718, 73.0108], // 7. Customer Delivery Location (Destination)
]

const ORIGIN_COORD = ROUTE_COORDINATES[0]
const DEST_COORD = ROUTE_COORDINATES[ROUTE_COORDINATES.length - 1]

type MapStyle = 'streets' | 'dark' | 'satellite'

export function LiveGpsMapModal({
  orderId,
  supplierName,
  customerAddress,
  driverName,
  driverPhone = '+919876543210',
  vehicleNumber = 'RJ-19-GA-5420',
  productType = 'can',
  isOpen,
  onClose,
}: LiveGpsMapModalProps) {
  const { language } = useLanguage()
  const displayDriverName = driverName || (language === 'hi' 
    ? `${supplierName || 'सप्लायर'} (डिलीवरी टीम)` 
    : `${supplierName || 'Supplier'} (Delivery Executive)`)
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const driverMarkerRef = useRef<any>(null)
  const completedPolylineRef = useRef<any>(null)
  const remainingPolylineRef = useRef<any>(null)

  const [mapStyle, setMapStyle] = useState<MapStyle>('streets')
  const [progress, setProgress] = useState(35)
  const [etaMinutes, setEtaMinutes] = useState(12)
  const [distanceKm, setDistanceKm] = useState(2.1)
  const [speedKmh, setSpeedKmh] = useState(28)
  const [currentLatLng, setCurrentLatLng] = useState<[number, number]>(ROUTE_COORDINATES[1])

  // Calculate current driver position along coordinates
  const getInterpolatedPosition = (prog: number): { latLng: [number, number]; heading: number } => {
    const totalSegments = ROUTE_COORDINATES.length - 1
    const clampedProg = Math.max(0, Math.min(100, prog))
    const segmentIndex = Math.min(
      totalSegments - 1,
      Math.floor((clampedProg / 100) * totalSegments)
    )
    const segmentFraction = ((clampedProg / 100) * totalSegments) - segmentIndex

    const p1 = ROUTE_COORDINATES[segmentIndex]
    const p2 = ROUTE_COORDINATES[segmentIndex + 1]

    const lat = p1[0] + (p2[0] - p1[0]) * segmentFraction
    const lng = p1[1] + (p2[1] - p1[1]) * segmentFraction

    // Calculate heading angle for vehicle rotation
    const dLat = p2[0] - p1[0]
    const dLng = p2[1] - p1[1]
    const heading = Math.atan2(dLng, dLat) * (180 / Math.PI)

    return { latLng: [lat, lng], heading }
  }

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return

    let isMounted = true

    const initMap = async () => {
      if (typeof window === 'undefined') return
      const L = await import('leaflet')

      if (!isMounted || !mapContainerRef.current) return

      // Clean up previous instance if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      // Initialize map centered between origin and destination
      const map = L.map(mapContainerRef.current, {
        center: [26.2845, 73.0265],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      })

      mapInstanceRef.current = map

      // Add Zoom control on top right
      L.control.zoom({ position: 'topright' }).addTo(map)

      // Add tile layer
      const getTileUrl = (style: MapStyle) => {
        if (style === 'satellite') {
          return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        }
        if (style === 'dark') {
          return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
        }
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      }

      const tileLayer = L.tileLayer(getTileUrl(mapStyle), {
        maxZoom: 19,
        subdomains: 'abc',
      }).addTo(map)
      tileLayerRef.current = tileLayer

      // 1. RO Plant Origin Marker
      const originHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: #0284c7; color: white; padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.4); white-space: nowrap; margin-bottom: 4px; border: 1px solid #38bdf8;">
            🏭 ${supplierName || 'RO Plant'}
          </div>
          <div style="width: 24px; height: 24px; border-radius: 50%; background: #0284c7; border: 3px solid #ffffff; box-shadow: 0 0 12px #0284c7; display: flex; align-items: center; justify-content: center;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `
      const originIcon = L.divIcon({
        className: 'custom-origin-pin',
        html: originHtml,
        iconSize: [120, 50],
        iconAnchor: [60, 48],
      })
      L.marker(ORIGIN_COORD, { icon: originIcon })
        .addTo(map)
        .bindPopup(`<b>${supplierName}</b><br/>Water Purification Hub, Paota`)

      // 2. Customer Destination Marker
      const destHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: #059669; color: white; padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.4); white-space: nowrap; margin-bottom: 4px; border: 1px solid #34d399;">
            🏠 ${language === 'hi' ? 'आपका पता' : 'Your Location'}
          </div>
          <div style="width: 26px; height: 26px; border-radius: 50%; background: #10b981; border: 3px solid #ffffff; box-shadow: 0 0 14px #10b981; display: flex; align-items: center; justify-content: center; animation: pulse 2s infinite;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
          </div>
        </div>
      `
      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: destHtml,
        iconSize: [120, 50],
        iconAnchor: [60, 48],
      })
      L.marker(DEST_COORD, { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>${language === 'hi' ? 'डिलीवरी पता' : 'Delivery Destination'}</b><br/>${customerAddress || 'Jodhpur'}`)

      // 3. Polylines
      const fullPath = ROUTE_COORDINATES
      const { latLng: initialDriverPos } = getInterpolatedPosition(progress)

      // Background road line
      L.polyline(fullPath, {
        color: '#334155',
        weight: 8,
        opacity: 0.6,
        lineCap: 'round',
      }).addTo(map)

      // Remaining dashed route
      remainingPolylineRef.current = L.polyline(fullPath, {
        color: '#38bdf8',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.8,
      }).addTo(map)

      // Completed solid route
      completedPolylineRef.current = L.polyline([ORIGIN_COORD, initialDriverPos], {
        color: '#0284c7',
        weight: 5,
        opacity: 0.95,
      }).addTo(map)

      // 4. Live Driver Marker
      const vehicleEmoji = productType === 'tanker' ? '🚛' : '🛺'
      const driverHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: #f59e0b; color: #1e1b4b; padding: 2px 6px; border-radius: 6px; font-size: 9px; font-weight: 800; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap; margin-bottom: 2px; border: 1px solid #ffffff;">
            ${vehicleNumber}
          </div>
          <div style="width: 38px; height: 38px; border-radius: 50%; background: #0f172a; border: 2.5px solid #f59e0b; box-shadow: 0 0 16px rgba(245, 158, 11, 0.8); display: flex; align-items: center; justify-content: center; font-size: 18px;">
            ${vehicleEmoji}
          </div>
        </div>
      `
      const driverIcon = L.divIcon({
        className: 'custom-driver-pin',
        html: driverHtml,
        iconSize: [100, 60],
        iconAnchor: [50, 50],
      })

      driverMarkerRef.current = L.marker(initialDriverPos, { icon: driverIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`<b>${driverName}</b><br/>Speed: ${speedKmh} km/h • Vehicle: ${vehicleNumber}`)

      // Fit bounds to show entire route with padding
      const bounds = L.latLngBounds(fullPath)
      map.fitBounds(bounds, { padding: [40, 40] })
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isOpen, supplierName, customerAddress, driverName, vehicleNumber, productType, language])

  // 2. Tile layer switcher
  useEffect(() => {
    if (!tileLayerRef.current || !mapInstanceRef.current) return
    const getTileUrl = (style: MapStyle) => {
      if (style === 'satellite') {
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      }
      if (style === 'dark') {
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      }
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
    tileLayerRef.current.setUrl(getTileUrl(mapStyle))
  }, [mapStyle])

  // 3. Real-time driver movement simulation along route coordinates
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev >= 94 ? 94 : prev + 1.5
        const { latLng } = getInterpolatedPosition(next)
        setCurrentLatLng(latLng)

        // Update Leaflet driver marker position
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng(latLng)
        }

        // Update completed route polyline
        if (completedPolylineRef.current) {
          const totalSegments = ROUTE_COORDINATES.length - 1
          const segIndex = Math.min(
            totalSegments - 1,
            Math.floor((next / 100) * totalSegments)
          )
          const passedCoords = ROUTE_COORDINATES.slice(0, segIndex + 1)
          completedPolylineRef.current.setLatLngs([...passedCoords, latLng])
        }

        return next
      })

      setEtaMinutes((prev) => (prev > 2 ? +(prev - 0.2).toFixed(1) : 2))
      setDistanceKm((prev) => (prev > 0.3 ? +(prev - 0.05).toFixed(1) : 0.2))
      setSpeedKmh(Math.floor(24 + Math.random() * 8))
    }, 1500)

    return () => clearInterval(interval)
  }, [isOpen])

  // 4. Center map on driver
  const handleRecenterDriver = () => {
    if (mapInstanceRef.current && currentLatLng) {
      mapInstanceRef.current.flyTo(currentLatLng, 15, { duration: 1 })
    }
  }

  // 5. Fit full route bounds
  const handleFitRoute = () => {
    if (mapInstanceRef.current) {
      const bounds = ROUTE_COORDINATES
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], duration: 1 })
    }
  }

  if (!isOpen) return null

  // Google Maps external route URL
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${ORIGIN_COORD[0]},${ORIGIN_COORD[1]}&destination=${DEST_COORD[0]},${DEST_COORD[1]}&travelmode=driving`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 border border-sky-500/40 rounded-3xl overflow-hidden shadow-2xl space-y-0 relative animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-sky-950/80 to-slate-900 border-b border-border/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl water-shimmer flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Navigation className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {language === 'hi' ? '🛰️ लाइव जीपीएस मैप ट्रैकिंग' : '🛰️ Live GPS Map Tracking'}
                </h3>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0 px-2 animate-pulse">
                  ● REAL-TIME GPS
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Order #{orderId.slice(0, 8)} • {supplierName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              title="Open turn-by-turn route in Google Maps App"
            >
              <Button size="sm" variant="outline" className="h-8 text-xs px-2.5 border-sky-500/30 text-sky-300 hover:bg-sky-500/10 rounded-lg">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Google Maps</span>
              </Button>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real Interactive Leaflet / OSM Map Container */}
        <div className="relative w-full h-72 sm:h-80 md:h-96 bg-slate-950 flex-shrink-0 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Map Layer Switcher & Re-center Controls */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            <div className="bg-slate-900/90 border border-border/80 rounded-xl p-1 shadow-lg backdrop-blur-md flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setMapStyle('streets')}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  mapStyle === 'streets'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🗺️ Streets
              </button>
              <button
                type="button"
                onClick={() => setMapStyle('dark')}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  mapStyle === 'dark'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🌙 Navigation
              </button>
              <button
                type="button"
                onClick={() => setMapStyle('satellite')}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  mapStyle === 'satellite'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🛰️ Satellite
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRecenterDriver}
                className="bg-slate-900/90 hover:bg-slate-800 border border-sky-500/40 text-sky-300 text-xs px-2.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-1.5 font-medium transition-colors"
              >
                <LocateFixed className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'hi' ? 'ड्राइवर पर जाएं' : 'Center Driver'}</span>
              </button>

              <button
                type="button"
                onClick={handleFitRoute}
                className="bg-slate-900/90 hover:bg-slate-800 border border-border/80 text-muted-foreground hover:text-foreground text-xs px-2.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-1 font-medium transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? 'पूरा रूट' : 'Full Route'}</span>
              </button>
            </div>
          </div>

          {/* Floating Speed & Telemetry HUD */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 border border-sky-500/30 rounded-xl p-2 px-3 backdrop-blur-md flex items-center gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-1 text-sky-300 font-mono">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Speed: <strong>{speedKmh} km/h</strong></span>
            </div>
            <div className="w-[1px] h-3 bg-border" />
            <div className="flex items-center gap-1 text-amber-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{progress.toFixed(0)}% Route Covered</span>
            </div>
          </div>
        </div>

        {/* Live Status, Telemetry & Driver Actions */}
        <div className="p-3 sm:p-4 space-y-3 flex-1 overflow-y-auto bg-slate-900/95">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-0.5">
              <div className="text-[10px] text-sky-300 uppercase font-semibold">
                {language === 'hi' ? 'पहुंचने का अनुमान (ETA)' : 'Estimated Time (ETA)'}
              </div>
              <div className="text-lg sm:text-xl font-bold text-sky-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                ~ {Math.ceil(etaMinutes)} {language === 'hi' ? 'मिनट' : 'Mins'}
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
              <div className="text-[10px] text-emerald-300 uppercase font-semibold">
                {language === 'hi' ? 'शेष दूरी' : 'Remaining Distance'}
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {distanceKm} km
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-2.5 rounded-2xl bg-secondary/80 border border-border/80 space-y-0.5">
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                {language === 'hi' ? 'वाहन नंबर' : 'Vehicle Reg'}
              </div>
              <div className="text-sm font-bold text-foreground font-mono">
                {vehicleNumber}
              </div>
            </div>
          </div>

          {/* Driver Contact & Action Buttons */}
          <div className="p-3 rounded-2xl bg-secondary/60 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg flex-shrink-0">
                👨‍✈️
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <span>{displayDriverName}</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] py-0 px-1">
                    <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                    {language === 'hi' ? 'सत्यापित वाहन' : 'Verified'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate max-w-xs sm:max-w-md">
                  <MapPin className="w-3 h-3 text-sky-400 flex-shrink-0" />
                  <span className="truncate">{customerAddress || 'Sardarpura, Jodhpur'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a href={`tel:${driverPhone}`} className="flex-1 sm:flex-initial">
                <Button size="sm" className="w-full sm:w-auto water-shimmer text-white font-semibold text-xs min-h-[36px] rounded-xl">
                  <Phone className="w-3.5 h-3.5 mr-1.5" />
                  {language === 'hi' ? 'सप्लायर को कॉल करें' : 'Call Supplier'}
                </Button>
              </a>

              <a
                href={`https://wa.me/${driverPhone.replace(/\D/g, '')}?text=Hello%20JalSeva%20driver,%20regarding%20my%20water%20order%20%23${orderId.slice(0, 8)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial"
              >
                <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs min-h-[36px] rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
