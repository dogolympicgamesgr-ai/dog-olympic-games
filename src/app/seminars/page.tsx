'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

export default function SeminarsPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [seminars, setSeminars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)

  useEffect(() => {
    loadSession()
    loadSeminars()
    loadStats()
  }, [])

  async function loadSession() {
    const res = await fetch('/auth/session')
    const data = await res.json()
    setSession(data)
  }

  async function loadStats() {
    const { count: total } = await supabase
      .from('seminars').select('id', { count: 'exact', head: true }).eq('status', 'approved')
    const { count: upcoming } = await supabase
      .from('seminars').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').gte('seminar_date', new Date().toISOString())
    setTotalCount(total || 0)
    setUpcomingCount(upcoming || 0)
  }

  async function loadSeminars(query = '') {
    setSearching(true)
    let q = supabase
      .from('seminars')
      .select('id, title_el, title_en, description_el, description_en, location, is_online, url, seminar_date, status')
      .eq('status', 'approved')
      .order('seminar_date', { ascending: true })
      .limit(50)
    if (query.trim()) q = q.ilike('title_el', `%${query}%`)
    const { data } = await q
    setSeminars(data || [])
    setLoading(false)
    setSearching(false)
  }

  const canCreate = session?.isAdmin || session?.roles?.includes('organizer')

  const formatDate = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(t('el-GR', 'en-GB'), {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  const isUpcoming = (iso: string) => iso && new Date(iso) > new Date()

  if (loading) return (
    <div style={{ minHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--accent)', fontFamily: 'Bebas Neue, sans-serif', fontSize: '2rem' }}>
        {t('Φόρτωση...', 'Loading...')}
      </p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'calc(var(--nav-height) + 2rem)', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
              📚 {t('Σεμινάρια', 'Seminars')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {t('Εκπαιδευτικά σεμινάρια, διαδικτυακά και δια ζώσης', 'Educational seminars, online and in-person')}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => router.push('/seminars/create')}
              style={{ background: 'var(--accent)', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              + {t('Νέο Σεμινάριο', 'New Seminar')}
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: t('Συνολικά', 'Total'), value: totalCount, icon: '📚' },
            { label: t('Επερχόμενα', 'Upcoming'), value: upcomingCount, icon: '📅' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', color: 'var(--accent)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', outline: 'none' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadSeminars(searchQuery)}
            placeholder={t('Αναζήτηση σεμιναρίου...', 'Search seminars...')}
          />
          <button
            onClick={() => loadSeminars(searchQuery)}
            disabled={searching}
            style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem' }}
          >
            {searching ? '...' : t('Αναζήτηση', 'Search')}
          </button>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {seminars.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>
              {t('Δεν βρέθηκαν σεμινάρια', 'No seminars found')}
            </p>
          )}
          {seminars.map(s => {
            const title = t(s.title_el, s.title_en || s.title_el)
            const upcoming = isUpcoming(s.seminar_date)
            return (
              <div
                key={s.id}
                onClick={() => router.push(`/seminars/${s.id}`)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                    {title}
                  </p>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    {s.is_online && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', background: 'rgba(126,184,247,0.15)', color: '#7eb8f7', border: '1px solid #7eb8f744' }}>
                        🌐 {t('Online', 'Online')}
                      </span>
                    )}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', background: upcoming ? 'rgba(212,175,55,0.15)' : 'var(--bg)', color: upcoming ? 'var(--accent)' : 'var(--text-secondary)', border: `1px solid ${upcoming ? 'var(--accent)' : 'var(--border)'}` }}>
                      {upcoming ? t('Επερχόμενο', 'Upcoming') : t('Ολοκληρώθηκε', 'Past')}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {s.seminar_date && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📅 {formatDate(s.seminar_date)}</span>
                  )}
                  {!s.is_online && s.location && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📍 {s.location}</span>
                  )}
                  {s.is_online && s.url && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🔗 {t('Διαδικτυακό', 'Online seminar')}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
