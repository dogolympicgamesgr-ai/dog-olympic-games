'use client'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface EventPin {
  id: string
  lat: number
  lng: number
  title_el: string
  title_en?: string
  location?: string
  event_date?: string
}

interface Props {
  events: EventPin[]
  lang?: 'el' | 'en'
  height?: string
  onEventClick?: (id: string) => void
}

function BoundsAdjuster({ events }: { events: EventPin[] }) {
  const map = useMap()
  useEffect(() => {
    if (events.length === 0) return
    if (events.length === 1) {
      map.setView([events[0].lat, events[0].lng], 13)
      return
    }
    const bounds = L.latLngBounds(events.map(e => [e.lat, e.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [events, map])
  return null
}

export default function MultiMarkerMap({ events, lang = 'el', height = '360px', onEventClick }: Props) {
  const defaultCenter: [number, number] = [39.0742, 21.8243] // Greece center
  const first = events[0]
  const center: [number, number] = first ? [first.lat, first.lng] : defaultCenter

  const formatDate = (iso?: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const title = (e: EventPin) => lang === 'el' ? e.title_el : (e.title_en || e.title_el)

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={center}
        zoom={events.length === 1 ? 13 : 7}
        style={{ width: '100%', height }}
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <BoundsAdjuster events={events} />
        {events.map(event => (
          <Marker key={event.id} position={[event.lat, event.lng]}>
            <Popup>
              <div style={{ minWidth: '160px', fontFamily: 'Outfit, sans-serif' }}>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 700, fontSize: '0.9rem', color: '#0a0f1e' }}>
                  {title(event)}
                </p>
                {event.event_date && (
                  <p style={{ margin: '0 0 0.15rem', fontSize: '0.78rem', color: '#444' }}>
                    📅 {formatDate(event.event_date)}
                  </p>
                )}
                {event.location && (
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#444' }}>
                    📍 {event.location}
                  </p>
                )}
                {onEventClick && (
                  <button
                    onClick={() => onEventClick(event.id)}
                    style={{
                      background: '#d4af37',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.3rem 0.75rem',
                      color: '#0a0f1e',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontFamily: 'Outfit, sans-serif',
                      width: '100%',
                    }}
                  >
                    {lang === 'el' ? 'Προβολή →' : 'View →'}
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  )
}
