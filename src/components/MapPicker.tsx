'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix Leaflet default marker icon broken in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props {
  lat: number | null
  lng: number | null
  onSelect: (lat: number, lng: number) => void
}

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

export default function MapPicker({ lat, lng, onSelect }: Props) {
  const defaultCenter: [number, number] = [40.6401, 22.9444] // Thessaloniki
  const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : defaultCenter

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={center}
        zoom={lat !== null ? 13 : 7}
        style={{ width: '100%', height: '280px' }}
        key={`${lat}-${lng}`}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onSelect={onSelect} />
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} />
        )}
      </MapContainer>
    </>
  )
}