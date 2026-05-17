'use client'

import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'

interface Props {
  lat: number
  lng: number
  address: string
}

export default function MapPopup({ lat, lng, address }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<import('leaflet').Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || instanceRef.current) return

    import('leaflet').then(L => {
      if (!mapRef.current || instanceRef.current) return

      // Fix default marker icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      L.marker([lat, lng]).addTo(map)

      instanceRef.current = map
    })

    return () => {
      instanceRef.current?.remove()
      instanceRef.current = null
    }
  }, [lat, lng])

  return (
    <div className="w-52 rounded-lg overflow-hidden shadow-xl border border-gray-200 bg-white">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} style={{ width: '100%', height: 150 }} />
      <div className="px-3 py-2 space-y-1">
        <p className="text-xs text-gray-700 leading-tight">{address}</p>
        <a
          href={`https://maps.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium"
        >
          <ExternalLink className="w-3 h-3" />
          View in Google Maps
        </a>
      </div>
    </div>
  )
}
