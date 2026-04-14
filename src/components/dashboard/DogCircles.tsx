'use client'
import { useState } from 'react'
import { useLang } from '@/context/LanguageContext'
import Link from 'next/link'

const ARC_RADIUS = 148
function degToRad(deg: number) { return (deg * Math.PI) / 180 }
function getAngles(count: number): number[] {
  if (count === 1) return [0]
  if (count === 2) return [330, 30]
  return [320, 0, 40]
}

export default function DogCircles({ dogs }: { dogs: any[] }) {
  const { t } = useLang()
  const [lightbox, setLightbox] = useState<string | null>(null)
  const shown = dogs.filter(d => d.status === 'active' || !d.status).slice(0, 3)

  if (shown.length === 0) return (
    <>
      <div className="dog-circles-desktop" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          left: `calc(50% + ${ARC_RADIUS * Math.cos(degToRad(0))}px - 32px)`,
          top: `calc(50% + ${ARC_RADIUS * Math.sin(degToRad(0))}px - 32px)`,
          width: '64px', height: '64px', borderRadius: '50%',
          border: '2px dashed var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', opacity: 0.4, background: 'var(--bg-card)',
        }}>🐕</div>
      </div>
      <div className="dog-circles-mobile">
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          border: '2px dashed var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', opacity: 0.4, background: 'var(--bg-card)',
        }}>🐕</div>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '0.25rem' }}>
          {t('Χωρίς σκύλο', 'No dogs')}
        </p>
      </div>
      <style>{dogCirclesStyle}</style>
    </>
  )

  const angles = getAngles(shown.length)

  return (
    <>
      {/* Desktop arc — pointerEvents none on wrapper, auto on each circle */}
      <div className="dog-circles-desktop" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {shown.map((dog, i) => {
          const angle = degToRad(angles[i])
          const x = ARC_RADIUS * Math.cos(angle)
          const y = ARC_RADIUS * Math.sin(angle)
          return (
            <div key={dog.id} style={{
              position: 'absolute',
              left: `calc(50% + ${x}px - 32px)`,
              top: `calc(50% + ${y}px - 32px)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              zIndex: 2,
              pointerEvents: 'auto',
            }}>
              <Link href={`/dogs/${dog.id}`} style={{ textDecoration: 'none' }}>
                <div
                  onClick={e => { if (dog.photo_url) { e.preventDefault(); setLightbox(dog.photo_url) } }}
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    border: '2px solid var(--accent)', background: 'var(--bg-card)',
                    overflow: 'hidden', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 12px rgba(232,185,79,0.2)',
                  }}
                >
                  {dog.photo_url
                    ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                    : <span style={{ fontSize: '1.5rem' }}>🐕</span>
                  }
                </div>
              </Link>
              <p style={{
                fontSize: '0.58rem', color: 'var(--text-secondary)', marginTop: '0.2rem',
                maxWidth: '64px', textAlign: 'center', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{dog.name}</p>
            </div>
          )
        })}
      </div>

      {/* Mobile row */}
      <div className="dog-circles-mobile">
        {shown.map(dog => (
          <div key={dog.id} style={{ textAlign: 'center' }}>
            <Link href={`/dogs/${dog.id}`} style={{ textDecoration: 'none' }}>
              <div
                onClick={e => { if (dog.photo_url) { e.preventDefault(); setLightbox(dog.photo_url) } }}
                style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  border: '2px solid var(--accent)', background: 'var(--bg-card)',
                  overflow: 'hidden', cursor: 'pointer', margin: '0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {dog.photo_url
                  ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                  : <span style={{ fontSize: '1.3rem' }}>🐕</span>
                }
              </div>
            </Link>
            <p style={{
              fontSize: '0.62rem', color: 'var(--text-secondary)', marginTop: '0.2rem',
              maxWidth: '56px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{dog.name}</p>
          </div>
        ))}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, cursor: 'zoom-out',
        }}>
          <img src={lightbox} alt="dog" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      <style>{dogCirclesStyle}</style>
    </>
  )
}

const dogCirclesStyle = `
  .dog-circles-desktop { display: block; }
  .dog-circles-mobile  { display: none; }
  @media (max-width: 600px) {
    .dog-circles-desktop { display: none !important; }
    .dog-circles-mobile  {
      display: flex !important;
      flex-direction: row;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 0.5rem;
    }
  }
`
