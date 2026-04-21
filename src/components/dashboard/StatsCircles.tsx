'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'

export default function StatsCircles({ dogCount, eventCount, dogs, results }: {
  dogCount: number, eventCount: number, dogs: any[], results: any[]
}) {
  const { t } = useLang()
  const router = useRouter()
  const [showDogs, setShowDogs] = useState(false)

  const bestDog = dogs.length > 0 ? dogs[0] : null
  const bestRank = '—'

  return (
    <>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '2rem',
        marginBottom: '3rem', flexWrap: 'wrap',
      }}>
        {/* Dog count */}
        <div onClick={() => dogCount > 0 && setShowDogs(true)} style={{
          width: '110px', height: '110px', borderRadius: '50%',
          border: '2px solid var(--accent)',
          background: 'var(--bg-card)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: dogCount > 0 ? 'pointer' : 'default',
          gap: '4px',
          boxShadow: '0 0 20px rgba(232,185,79,0.1)',
          transition: 'transform 0.2s',
        }}>
          <span style={{ fontSize: '1.8rem', fontFamily: 'Bebas Neue, sans-serif', color: 'var(--accent)' }}>{dogCount}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0 8px' }}>
            {t('Σκύλοι', 'Dogs')}
          </span>
        </div>

        {/* Events count */}
        <div style={{
          width: '110px', height: '110px', borderRadius: '50%',
          border: '2px solid var(--accent)',
          background: 'var(--bg-card)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '4px',
          boxShadow: '0 0 20px rgba(232,185,79,0.1)',
        }}>
          <span style={{ fontSize: '1.8rem', fontFamily: 'Bebas Neue, sans-serif', color: 'var(--accent)' }}>{eventCount}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0 8px' }}>
            {t('Αγώνες', 'Events')}
          </span>
        </div>

        {/* Best ranking */}
        <div style={{
          width: '110px', height: '110px', borderRadius: '50%',
          border: '2px solid var(--accent)',
          background: 'var(--bg-card)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '4px',
          boxShadow: '0 0 20px rgba(232,185,79,0.1)',
        }}>
          <span style={{ fontSize: '1.4rem', fontFamily: 'Bebas Neue, sans-serif', color: 'var(--accent)' }}>{bestRank}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '0 8px' }}>
            {t('Καλύτερη Κατάταξη', 'Best Ranking')}
            {bestDog && <><br/><span style={{ color: 'var(--accent)', fontSize: '0.65rem' }}>{bestDog.name}</span></>}
          </span>
        </div>
      </div>

      {/* Dogs modal */}
      {showDogs && (
        <div onClick={() => setShowDogs(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '2rem', minWidth: '300px', maxWidth: '500px', width: '100%',
          }}>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: 'var(--accent)', marginBottom: '1.5rem' }}>
              {t('Οι Σκύλοι μου', 'My Dogs')}
            </h2>
            {dogs.map(dog => (
              <div
                key={dog.id}
                onClick={() => { setShowDogs(false); router.push(`/dogs/${dog.id}`) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.75rem 0', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  border: '2px solid var(--accent)', overflow: 'hidden',
                  background: 'var(--bg)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {dog.photo_url
                    ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span>🐕</span>
                  }
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dog.name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {dog.dog_id}</p>
                </div>
              </div>
            ))}
            <button onClick={() => setShowDogs(false)} style={{
              marginTop: '1.5rem', width: '100%',
              background: 'var(--accent)', border: 'none', borderRadius: '8px',
              padding: '0.75rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif', fontSize: '1rem',
            }}>
              {t('Κλείσιμο', 'Close')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}