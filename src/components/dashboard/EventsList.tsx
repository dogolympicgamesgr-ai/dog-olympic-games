'use client'
import { useLang } from '@/context/LanguageContext'

export default function EventsList({ results, profile }: { results: any[], profile: any }) {
  const { t } = useLang()

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
      marginTop: '1rem',
    }}>
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}>
        <h3 style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '1.3rem',
          color: 'var(--accent)',
          letterSpacing: '0.05em',
        }}>
          {t('Ιστορικό Δραστηριότητας', 'Activity History')}
        </h3>
      </div>

      {results.length === 0 ? (
        <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {t('Δεν υπάρχουν καταχωρήσεις ακόμα', 'No entries yet')}
        </div>
      ) : (
        results.map((result, i) => {
          const event = result.events
          const dogName = result.dogs?.name
          const date = event?.event_date ? new Date(event.event_date).toLocaleDateString('el-GR') : '—'
          const location = event?.location || '—'
          const title = t(event?.title_el || '—', event?.title_en || event?.title_el || '—')

          return (
            <div key={result.id} style={{
              padding: '1rem 1.5rem',
              borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              gap: '1rem',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  {t('Συμμετοχή', 'Participated')} — <strong>{title}</strong>
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {location} · {date}
                  {dogName && <> · <span style={{ color: 'var(--accent)' }}>{dogName}</span></>}
                </p>
              </div>
              {result.placement && (
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '0.3rem 0.75rem',
                  color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  #{result.placement}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
