'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

export default function EventsPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [totalEvents, setTotalEvents] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)

  useEffect(() => {
    loadSession()
    loadEvents()
    loadStats()
  }, [])

  async function loadSession() {
    const res = await fetch('/auth/session')
    const data = await res.json()
    setSession(data)
  }

  async function loadStats() {
    const { count: total } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')

    const { count: upcoming } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('event_date', new Date().toISOString())

    setTotalEvents(total || 0)
    setUpcomingCount(upcoming || 0)
  }

  async function loadEvents(query = '') {
    setSearching(true)
    let q = supabase
      .from('events')
      .select(`
        id, title_el, title_en, description_el, description_en,
        location, address, event_date, banner_url,
        contact_name, registration_deadline, max_participants,
        status, created_by,
        event_categories(id, title_el, title_en, sport_id, is_championship)
      `)
      .eq('status', 'approved')
      .order('event_date', { ascending: true })
      .limit(50)

    if (query.trim()) q = q.ilike('title_el', `%${query}%`)

    const { data } = await q
    setEvents(data || [])
    setLoading(false)
    setSearching(false)
  }

  const canCreate = session?.isAdmin || session?.roles?.includes('organizer')

  const formatDate = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(t('el-GR', 'en-GB'), {
      day: 'numeric', month: 'long', year: 'numeric'
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
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      paddingTop: 'calc(var(--nav-height) + 2rem)',
      paddingBottom: '3rem'
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '2.5rem',
              letterSpacing: '0.05em',
              color: 'var(--text-primary)',
              margin: '0 0 0.25rem'
            }}>
              🏆 {t('Αγώνες', 'Events')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {t('Επίσημοι αγώνες και επερχόμενες εκδηλώσεις', 'Official competitions and upcoming events')}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => router.push('/events/create')}
              style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.25rem',
                color: 'var(--bg)',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
              + {t('Νέος Αγώνας', 'New Event')}
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: t('Συνολικοί Αγώνες', 'Total Events'), value: totalEvents, icon: '🏆' },
            { label: t('Επερχόμενοι', 'Upcoming'), value: upcomingCount, icon: '📅' },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
              <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.6rem', color: 'var(--accent)' }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input
            style={{
              flex: 1,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              fontFamily: 'Outfit, sans-serif',
              outline: 'none',
            }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loadEvents(searchQuery)}
            placeholder={t('Αναζήτηση αγώνα...', 'Search events...')}
          />
          <button
            onClick={() => loadEvents(searchQuery)}
            disabled={searching}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.25rem',
              color: 'var(--bg)',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap',
            }}>
            {searching ? '...' : t('Αναζήτηση', 'Search')}
          </button>
        </div>

        {/* Events list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {events.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>
              {t('Δεν βρέθηκαν αγώνες', 'No events found')}
            </p>
          )}
          {events.map((event: any) => {
            const title = t(event.title_el, event.title_en || event.title_el)
            const upcoming = isUpcoming(event.event_date)
            const categories = event.event_categories || []
            return (
              <div
                key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {/* Banner */}
                {event.banner_url && (
                  <div style={{ width: '100%', height: '140px', overflow: 'hidden' }}>
                    <img
                      src={event.banner_url}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}

                <div style={{ padding: '1rem 1.25rem' }}>
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <p style={{
                      margin: 0,
                      fontFamily: 'Bebas Neue, sans-serif',
                      fontSize: '1.3rem',
                      letterSpacing: '0.04em',
                      color: 'var(--text-primary)',
                    }}>
                      {title}
                    </p>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '99px',
                      background: upcoming ? 'rgba(var(--accent-rgb, 212,175,55), 0.15)' : 'var(--bg)',
                      color: upcoming ? 'var(--accent)' : 'var(--text-secondary)',
                      border: `1px solid ${upcoming ? 'var(--accent)' : 'var(--border)'}`,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {upcoming ? t('Επερχόμενος', 'Upcoming') : t('Ολοκληρώθηκε', 'Past')}
                    </span>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.75rem' }}>
                    {event.event_date && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        📅 {formatDate(event.event_date)}
                      </span>
                    )}
                    {event.location && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        📍 {event.location}{event.address ? ` — ${event.address}` : ''}
                      </span>
                    )}
                    
                </div>

                  {/* Categories pills */}
                  {categories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {categories.map((cat: any) => (
                        <span key={cat.id} style={{
                          fontSize: '0.7rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '99px',
                          background: 'var(--bg)',
                          color: cat.is_championship ? 'var(--accent)' : 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}>
                          {cat.is_championship ? '🥇 ' : ''}{t(cat.title_el, cat.title_en || cat.title_el)}
                        </span>
                      ))}
                    </div>
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