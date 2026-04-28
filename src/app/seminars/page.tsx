'use client'
import { useState, useEffect } from 'react'
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

export default function SeminarsPage() {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [seminars, setSeminars] = useState<any[]>([])
  const [dotDates, setDotDates] = useState<string[]>([])
  const [allCoordSeminars, setAllCoordSeminars] = useState<any[]>([])
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
    setSeminars([])
    loadSeminars(0, searchQuery, selectedDate)
  }, [selectedDate])

  async function loadDotDates() {
    const { data } = await supabase
      .from('seminars')
      .select('id, seminar_date, lat, lng, title_el, title_en, location, is_online')
      .eq('status', 'approved')
      .gte('seminar_date', new Date().toISOString())
    setDotDates((data || []).map((s: any) => s.seminar_date))
    setAllCoordSeminars((data || []).filter((s: any) => s.lat && s.lng && !s.is_online))
  }

  async function loadSeminars(currentOffset: number, query: string, date: string | null) {
    if (currentOffset === 0) setLoading(true)
    else setLoadingMore(true)

    const pageSize = getPageSize()

    let q = supabase
      .from('seminars')
      .select('id, title_el, title_en, location, address, is_online, seminar_date, lat, lng, banner_url')
      .eq('status', 'approved')
      .order('seminar_date', { ascending: true })
      .range(currentOffset, currentOffset + pageSize - 1)

    if (date) {
      const from = `${date}T00:00:00.000Z`
      const to = `${date}T23:59:59.999Z`
      q = q.gte('seminar_date', from).lte('seminar_date', to)
    } else {
      q = q.gte('seminar_date', new Date().toISOString())
    }

    if (query.trim()) q = q.ilike('title_el', `%${query}%`)

    const { data } = await q
    const fetched = data || []

    if (currentOffset === 0) {
      setSeminars(fetched)
    } else {
      setSeminars(prev => [...prev, ...fetched])
    }

    setHasMore(fetched.length === pageSize)
    setLoading(false)
    setLoadingMore(false)
  }

  function handleSearch() {
    setOffset(0)
    setSeminars([])
    setSelectedDate(null)
    loadSeminars(0, searchQuery, null)
  }

  function handleDateSelect(date: string | null) {
    setSelectedDate(date)
    setSearchQuery('')
  }

  async function handleLoadMore() {
    const newOffset = offset + getPageSize()
    setOffset(newOffset)
    await loadSeminars(newOffset, searchQuery, selectedDate)
  }

  const formatDate = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString(t('el-GR', 'en-GB'), {
      day: 'numeric', month: 'long', year: 'numeric',
    })
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
              📚 {t('Σεμινάρια', 'Seminars')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
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
              placeholder={t('Αναζήτηση σεμιναρίου...', 'Search seminars...')}
            />
            <button
              onClick={handleSearch}
              style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', color: 'var(--bg)', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
            >
              {t('Αναζήτηση', 'Search')}
            </button>
          </div>

          {/* Map toggle — only for in-person seminars with coords */}
          {allCoordSeminars.length > 0 && (
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
        {showMap && allCoordSeminars.length > 0 && (
          <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <MultiMarkerMap
              events={allCoordSeminars.map(s => ({
                id: s.id,
                lat: s.lat,
                lng: s.lng,
                title_el: s.title_el,
                title_en: s.title_en,
                location: s.location,
                event_date: s.seminar_date,
              }))}
              lang={currentLang}
              height="340px"
              onEventClick={id => router.push(`/seminars/${id}`)}
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

        {/* Seminars list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {seminars.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem 0' }}>
              {t('Δεν βρέθηκαν επερχόμενα σεμινάρια', 'No upcoming seminars found')}
            </p>
          )}
          {seminars.map(s => {
            const title = t(s.title_el, s.title_en || s.title_el)
            return (
              <div
                key={s.id}
                onClick={() => router.push(`/seminars/${s.id}`)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {s.banner_url && (
                  <div style={{ width: '100%', height: '130px', overflow: 'hidden' }}>
                    <img src={s.banner_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <p style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: '1.3rem', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
                      {title}
                    </p>
                    {s.is_online && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '99px', background: 'rgba(126,184,247,0.15)', color: '#7eb8f7', border: '1px solid #7eb8f744', flexShrink: 0 }}>
                        🌐 Online
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {s.seminar_date && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📅 {formatDate(s.seminar_date)}</span>
                    )}
                    {!s.is_online && s.location && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        📍 {s.location}{s.address ? ` — ${s.address}` : ''}
                      </span>
                    )}
                    {s.is_online && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🔗 {t('Διαδικτυακό', 'Online seminar')}</span>
                    )}
                  </div>
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
              {loadingMore ? t('Φόρτωση...', 'Loading...') : t('Περισσότερα Σεμινάρια', 'Load More Seminars')}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
