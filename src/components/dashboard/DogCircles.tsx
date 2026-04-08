'use client'
import { useState } from 'react'
import { useLang } from '@/context/LanguageContext'

export default function DogCircles({ dogs }: { dogs: any[] }) {
  const { t } = useLang()
  const [lightbox, setLightbox] = useState<string | null>(null)
  const shown = dogs.slice(0, 3)

  if (shown.length === 0) return (
    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        border: '2px dashed var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 0.5rem', fontSize: '1.5rem', opacity: 0.4,
      }}>🐕</div>
      <span>{t('Χωρίς σκύλο', 'No dogs')}</span>
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        {shown.map(dog => (
          <div key={dog.id} style={{ textAlign: 'center' }}>
            <div
              onClick={() => dog.photo_url && setLightbox(dog.photo_url)}
              style={{
                width: '64px', height: '64px', borderRadius: '50%',
                border: '2px solid var(--accent)',
                background: 'var(--bg-card)',
                overflow: 'hidden', cursor: dog.photo_url ? 'zoom-in' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto',
              }}>
              {dog.photo_url
                ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                : <span style={{ fontSize: '1.5rem' }}>🐕</span>
              }
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{dog.name}</p>
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
    </>
  )
}
