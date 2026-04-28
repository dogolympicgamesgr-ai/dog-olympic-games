'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import EventCalendar from '@/components/EventCalendar'

const MultiMarkerMap = dynamic(() => import('@/components/MultiMarkerMap'), { ssr: false })

const PAGE_SIZE_MOBILE = 7
const PAGE_SIZE_DESKTOP = 20

function getPageSize() {
  if (typeof window === 'undefined') return PAGE_SIZE_MOBILE
  return window.innerWidth <= 640 ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP
}

function toYMD(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EventsPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [events, setEvents] = useState<any[]>([])
  const [dotDates, setDotDates] = useState<string[]>([])
  const [allCoordEvents, setAllCoordEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [showMap, setShowMap] = useState(false)
  const currentLang = t('el', 'en') as 'el' | 'en'

  useEffect(() => {
    fetch('/auth/session').then(r => r.json()).then(setSession)
    loadDotDates()
  }, [])

  useEffect(() => {
    setOffset(0)
    setEvents([])
    loadEvents(0, searchQuery, selectedDate)
  }, [selectedDate])

  async function loadDotDates() {
    // Lightweight query — just dates + coords for calendar dots and map
    const { data } = await supabase
      .from('events')
      .select('id, event_date, lat, lng, title_el, title_en, location')
      .eq('status', 'approved')
      .gte('event_date', new Date().toISOString())
    setDotDates((data || []).map((e: any) => e.event_date))
    setAllCoordEvents((data || []).filter((e: any) => e.lat && e.lng))
  }

  async function loadEvents(currentOffset: number, query: string, date: string | null) {
    if (currentOffset === 0) setLoading(true)
    else setLoadingMore(true)

    const pageSize = getPageSize()

    let q = supabase
      .from('events')
      .select(`
        id, title_el, title_en, event_date, banner_url,
        location, address, registration_deadline, max_participants, lat, lng,
        event_categories(id, title_el, title_en, is_championship)
      `)
      .eq('status', 'approved')
      .order('event_date', { ascending: true })
      .range(currentOffset, currentOffset + pageSize - 1)

    if (date) {
      // Filter to specific date: from midnight to end of day
      const from = `${date}T00:00:00.000Z`
      const to = `${date}T23:59:59.999Z`
      q = q.gte('event_date', from).lte('event_date', to)
    } else {
      q = q.gte('event_date', new Date().toISOString())
    }

    if (query.trim()) q = q.ilike('title_el', `%${query}%`)

    const { data } = await q
    const fetched = data || []

    if (currentOffset === 0) {
      setEvents(fetched)
    } else {
      setEvents(prev => [...prev, ...fetched])
    }

    setHasMore(fetched.length === pageSize)
    setLoading(false)
    setLoadingMore(false)
  }

  function handleSearch() {
    setOffset(0)
    setEvents([])
    setSelectedDate(null)
    loadEvents(0, searchQuery, null)
  }

  function handleDateSelect(date: string | null) {
    setSelectedDate(date)
    setSearchQuery('')
  }

  async function handleLoadMore() {
    const newOffset = offset + getPageSize()
    setOffset(newOffset)
    await loadEvents(newOffset, searchQuery, selectedDate)
  }

  const formatDate = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(t('el-GR', 'en-GB'), {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  function regOpen(ev: any) {
    if (!ev.registration_deadline) return new Date(ev.event_date) > new Date()
    return new Date() < new Date(ev.registration_deadline)
  }

  const canCreate = session?.isAdmin || session?.roles?.includes('organizer')

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
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '2.5rem', letterSpacing: '0.05em', color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
              🏆 {t('Αγώνες', 'Events')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              {t('Επίσημοι αγώνες και επερχόμενες εκδηλώσεις', 'Official competitions and upcoming events')}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => router.push('/events/create')}
              style={{ background: 'var(--accent)', border: 'none', borderRadius: '10px', padding: '0.65rem 1.25rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              + {t('Νέος Αγώνας', 'New Event')}
            </button>
          )}
        </div>

        {/* Calendar */}
        <EventCalendar
          dotDates={dotDates}
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
        />

        {/* Search row */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.65rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', outline: 'none' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder={t('Αναζήτηση αγώνα...', 'Search events...')}
            />
            <button
              onClick={handleSearch}
              style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            >
              {t('Αναζήτηση', 'Search')}
            </button>
          </div>

          {/* Map toggle */}
          {allCoordEvents.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                onClick={() => setShowMap(v => !v)}
                style={{ background: showMap ? 'var(--accent)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem', color: showMap ? 'var(--bg)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.85rem' }}
              >
                🗺️ {t('Χάρτης', 'Map')}
              </button>
            </div>
          )}
        </div>

        {/* Map */}
        {showMap && allCoordEvents.length > 0 && (
          <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <MultiMarkerMap
              events={allCoordEvents}
              lang={currentLang}
              height="340px"
              onEventClick={id => router.push(`/events/${id}`)}
            />
          </div>
        )}

        {/* Active date filter banner */}
        {selectedDate && (
          <div style={{ marginBottom: '1rem', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: '10px', padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--accent)', fontWeight: 600 }}>
              📅 {new Date(selectedDate + 'T12:00:00').toLocaleDateString(t('el-GR', 'en-GB'), { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => handleDateSelect(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Outfit, sans-serif' }}>
              {t('Εκκαθάριση', 'Clear')} ✕
            </button>
          </div>
        )}

        {/* Events list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {events.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>
              {t('Δεν βρέθηκαν επερχόμενοι αγώνες', 'No upcoming events found')}
            </p>
          )}
          {events.map((event: any) => {
            const title = t(event.title_el, event.title_en || event.title_el)
            const categories = event.event_categories || []
            const open = regOpen(event)
            return (
              <div
                key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {event.banner_url && (
                  <div style={{ width: '100%', height: '140px', overflow: 'hidden' }}>
                    <img src={event.banner_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '1rem 1.25rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                    {title}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.65rem' }}>
                    {event.event_date && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📅 {formatDate(event.event_date)}</span>
                    )}
                    {event.location && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📍 {event.location}{event.address ? ` — ${event.address}` : ''}</span>
                    )}
                    {event.registration_deadline && (
                      <span style={{ fontSize: '0.78rem', color: open ? '#7ef7a0' : '#f77e7e', fontWeight: 600 }}>
                        {open ? `⏳ ${t('Εγγραφές έως', 'Register by')} ${formatDate(event.registration_deadline)}` : `🔒 ${t('Εγγραφές έκλεισαν', 'Registration closed')}`}
                      </span>
                    )}
                  </div>
                  {categories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {categories.map((cat: any) => (
                        <span key={cat.id} style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', borderRadius: '99px', background: 'var(--bg)', color: cat.is_championship ? 'var(--accent)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
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

        {/* Load More */}
        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 2rem', color: 'var(--text-secondary)', cursor: loadingMore ? 'default' : 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.9rem', opacity: loadingMore ? 0.6 : 1 }}
            >
              {loadingMore ? t('Φόρτωση...', 'Loading...') : t('Περισσότεροι Αγώνες', 'Load More Events')}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
