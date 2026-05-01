'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LanguageContext'

const DISCIPLINE_ICONS: Record<string, string> = {
  'Υπακοή':    '🎯',
  'Προστασία': '🛡️',
  'Ανίχνευση': '🔍',
  'Ευκινησία': '⚡',
}

type DogRanking = {
  dog: any
  foundationRank: any  // row from foundation_ranking
  sportRanks: any[]    // rows from dog_sport_ranking joined with sports
}

export default function StatsCircles({
  dogCount,
  eventCount,
  dogs,
  results,
  dogRankings,
}: {
  dogCount: number
  eventCount: number
  dogs: any[]
  results: any[]
  dogRankings?: DogRanking[]
}) {
  const { t } = useLang()
  const router = useRouter()
  const [showDogs, setShowDogs] = useState(false)

  // Build flat list of all titles across all dogs
  const allTitles: { dogName: string; dogId: string; label: string; icon: string; color: string }[] = []

 for (const { dog, foundationRank, sportRanks } of (dogRankings ?? [])) {
    if (foundationRank?.entry_title) {
      allTitles.push({
        dogName: dog.name,
        dogId: dog.id,
        label: t('Εισαγωγικό Επίπεδο', 'Entry Level'),
        icon: '⭐',
        color: '#7eb8f7',
      })
    }
    if (foundationRank?.basic_title) {
      allTitles.push({
        dogName: dog.name,
        dogId: dog.id,
        label: t('Βασικό Επίπεδο', 'Basic Level'),
        icon: '⭐⭐',
        color: '#7ef7a0',
      })
    }
    for (const sr of sportRanks) {
      if (sr.sports?.is_foundation) continue
      if (!sr.title) continue
      const sportName = t(sr.sports?.name_el, sr.sports?.name_en) || sr.sports?.name_el || '?'
      allTitles.push({
        dogName: dog.name,
        dogId: dog.id,
        label: sportName,
        icon: DISCIPLINE_ICONS[sr.sports?.name_el] || '🏅',
        color: 'var(--accent)',
      })
    }
  }

  return (
    <>
      {/* 2 stat circles */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '2rem',
        marginBottom: '2rem', flexWrap: 'wrap',
      }}>
        {/* Dog count */}
        <div
          onClick={() => dogCount > 0 && setShowDogs(true)}
          style={{
            width: '110px', height: '110px', borderRadius: '50%',
            border: '2px solid var(--accent)',
            background: 'var(--bg-card)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: dogCount > 0 ? 'pointer' : 'default',
            gap: '4px',
            boxShadow: '0 0 20px rgba(232,185,79,0.1)',
            transition: 'transform 0.2s',
          }}
        >
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
      </div>

      {/* Titles section */}
      {allTitles.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem',
            letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '1rem',
          }}>
            🏅 {t('Τίτλοι', 'Titles')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {allTitles.map((title, i) => (
              <div
                key={i}
                onClick={() => router.push(`/dogs/${title.dogId}`)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '10px', padding: '0.75rem 1.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = title.color }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{title.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      {title.label}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {title.dogName}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700,
                  padding: '0.2rem 0.65rem', borderRadius: '99px',
                  background: 'rgba(232,185,79,0.1)',
                  border: `1px solid ${title.color}`,
                  color: title.color,
                  whiteSpace: 'nowrap',
                }}>
                  🏅 {t('Τίτλος', 'Title')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dogs modal */}
      {showDogs && (
        <div
          onClick={() => setShowDogs(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '2rem', minWidth: '300px', maxWidth: '500px', width: '100%',
            }}
          >
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.8rem', color: 'var(--accent)', marginBottom: '1.5rem' }}>
              {t('Σκύλοι', 'Dogs')}
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
            <button
              onClick={() => setShowDogs(false)}
              style={{
                marginTop: '1.5rem', width: '100%',
                background: 'var(--accent)', border: 'none', borderRadius: '8px',
                padding: '0.75rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif', fontSize: '1rem',
              }}
            >
              {t('Κλείσιμο', 'Close')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
