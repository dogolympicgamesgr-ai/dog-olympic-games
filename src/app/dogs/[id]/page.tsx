'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'

export default function DogProfilePage() {
  const { t } = useLang()
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [dog, setDog] = useState<any>(null)
  const [owner, setOwner] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    if (id) loadDog(id as string)
  }, [id])

  async function loadDog(dogId: string) {
    const [dogRes, resultsRes] = await Promise.all([
      supabase.from('dogs').select('*, breeds(name)').eq('id', dogId).single(),
      supabase.from('competition_results')
        .select('*, events(name, date, location)')
        .eq('dog_id', dogId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false }),
    ])
    if (!dogRes.data) { router.push('/'); return }
    setDog(dogRes.data)
    setResults(resultsRes.data || [])
    const ownerRes = await supabase.from('profiles').select('full_name, member_id, avatar_url').eq('id', dogRes.data.owner_id).single()
    setOwner(ownerRes.data)
    setLoading(false)
  }

  function calcAge(dob: string): string {
    if (!dob) return '—'
    const birth = new Date(dob)
    const now = new Date()
    let years = now.getFullYear() - birth.getFullYear()
    let months = now.getMonth() - birth.getMonth()
    if (months < 0) { years--; months += 12 }
    if (years === 0) return `${months} ${t('μήνες', 'months')}`
    if (months === 0) return `${years} ${t('χρόνια', 'years')}`
    return `${years} ${t('χρόνια', 'years')} ${t('και', 'and')} ${months} ${t('μήνες', 'months')}`
  }

  function formatDate(iso: string) {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  const statusColor = (s: string) => {
    if (s === 'active') return '#4caf50'
    if (s === 'retired') return 'var(--text-secondary)'
    if (s === 'in_our_memories') return '#9575cd'
    return 'var(--text-secondary)'
  }

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem', letterSpacing: '0.1em' }}>
        {t('Φόρτωση...', 'Loading...')}
      </div>
    </div>
  )

  const isDeceased = dog.status === 'in_our_memories'

  return (
    <div style={{ minHeight: '90vh', padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Top section — photo + basic info side by side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', paddingTop: '1rem', flexWrap: 'wrap' as const }}>

        {/* Photo circle */}
        <div
          onClick={() => dog.photo_url && setLightbox(true)}
          style={{
            width: '180px', height: '180px', borderRadius: '50%',
            border: `3px solid ${statusColor(dog.status || 'active')}`,
            background: 'var(--bg-card)', overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 30px ${isDeceased ? 'rgba(149,117,205,0.2)' : 'rgba(232,185,79,0.15)'}`,
            cursor: dog.photo_url ? 'zoom-in' : 'default',
          }}
        >
          {dog.photo_url
            ? <img src={dog.photo_url} alt={dog.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
            : <span style={{ fontSize: '5rem' }}>{isDeceased ? '🕯️' : '🐕'}</span>
          }
        </div>

        {/* Info next to photo */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontFamily: 'Bebas Neue, sans-serif',
            letterSpacing: '0.05em',
            color: 'var(--text-primary)',
            marginBottom: '0.25rem',
          }}>
            {dog.name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.15rem' }}>
            Dog ID: {dog.dog_id}
          </p>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: statusColor(dog.status || 'active'), marginBottom: '0.5rem' }}>
            ● {dog.status === 'active' ? t('Ενεργός', 'Active') : dog.status === 'retired' ? t('Αποσυρμένος', 'Retired') : '🕯️ ' + t('Στη μνήμη του', 'In our memories')}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
            {dog.breeds?.name || t('Άγνωστη φυλή', 'Unknown breed')}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
            {dog.gender === 'male' ? t('Αρσενικό', 'Male') : dog.gender === 'female' ? t('Θηλυκό', 'Female') : ''}
            {dog.neutered ? ` · ${t('Στειρωμένο', 'Neutered')}` : ''}
          </p>
          {/* Age — hidden if deceased */}
          {!isDeceased && dog.date_of_birth && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {calcAge(dog.date_of_birth)}
            </p>
          )}

          {/* Titles list */}
          {results.length > 0 && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap' as const, gap: '0.4rem' }}>
              {/* Placeholder until ranking system is built */}
              <span style={{
                background: 'rgba(232,185,79,0.1)', border: '1px solid rgba(232,185,79,0.3)',
                borderRadius: '20px', padding: '0.2rem 0.65rem',
                fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600,
              }}>
                🏅 {t('Τίτλοι TBD', 'Titles TBD')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Owner */}
      {owner && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '1rem', marginBottom: '2rem',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            border: '2px solid var(--accent)', overflow: 'hidden',
            background: 'var(--bg)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {owner.avatar_url
              ? <img src={owner.avatar_url} alt={owner.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1.2rem' }}>🐾</span>
            }
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>{t('Ιδιοκτήτης', 'Owner')}</p>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{owner.full_name}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>ID: {owner.member_id}</p>
          </div>
        </div>
      )}

      {/* Stats circles — smaller */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem',
      }}>
        {[
          { label: t('Αγώνες', 'Events'), value: results.length },
          { label: t('Πόντοι', 'Points'), value: '—' },
          { label: t('Κατάταξη', 'Best Rank'), value: '—' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '50%', aspectRatio: '1',
            display: 'flex', flexDirection: 'column' as const,
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(232,185,79,0.08)',
          }}>
            <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', fontFamily: 'Bebas Neue, sans-serif', color: 'var(--accent)', letterSpacing: '0.05em' }}>{stat.value}</p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center', padding: '0 0.25rem' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Events list */}
      <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', letterSpacing: '0.05em', color: 'var(--text-primary)', marginBottom: '1rem' }}>
        {t('Ιστορικό Αγώνων', 'Competition History')}
      </h2>

      {results.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '2rem', textAlign: 'center',
          color: 'var(--text-secondary)', fontSize: '0.9rem',
        }}>
          {t('Δεν υπάρχουν αγώνες ακόμα.', 'No competitions yet.')}
        </div>
      ) : (
        results.map(r => (
          <div key={r.id} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{r.events?.name || '—'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {formatDate(r.events?.date)}{r.events?.location ? ` · ${r.events.location}` : ''}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {r.placement && <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', color: 'var(--accent)' }}>#{r.placement}</p>}
              {r.score && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.score} pts</p>}
            </div>
          </div>
        ))
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, cursor: 'zoom-out',
        }}>
          <img src={dog.photo_url} alt={dog.name} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  )
}