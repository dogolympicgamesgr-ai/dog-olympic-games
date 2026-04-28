'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'

const PAGE_SIZE = 3

interface Props {
  userId: string
}

export default function MyUpcomingRegistrations({ userId }: Props) {
  const { t } = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (userId) loadItems(0)
  }, [userId])

  async function loadItems(currentOffset: number) {
    if (currentOffset === 0) setLoading(true)
    else setLoadingMore(true)

    const now = new Date().toISOString()

    // Fetch event registrations
    const { data: eventRegs } = await supabase
      .from('event_registrations')
      .select(`
        id,
        category_id,
        dog_id,
        dogs!event_registrations_dog_id_fkey(name),
        event_categories!event_registrations_category_id_fkey(
          id, title_el, title_en,
          events!inner(id, title_el, title_en, event_date, location, status)
        )
      `)
      .eq('owner_id', userId)
      .eq('status', 'confirmed')
      .gt('event_categories.events.event_date', now)
      .neq('event_categories.events.status', 'cancelled')

    // Fetch seminar registrations
    const { data: seminarRegs } = await supabase
      .from('seminar_registrations')
      .select(`
        id,
        seminars!seminar_registrations_seminar_id_fkey(
          id, title_el, title_en, seminar_date, location, is_online, status
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gt('seminars.seminar_date', now)
      .neq('seminars.status', 'cancelled')

    // Normalise to a common shape
    const eventItems = (eventRegs || [])
      .filter((r: any) => r.event_categories?.events)
      .map((r: any) => ({
        id: `event-${r.id}`,
        type: 'event' as const,
        title_el: r.event_categories.events.title_el,
        title_en: r.event_categories.events.title_en,
        date: r.event_categories.events.event_date,
        location: r.event_categories.events.location,
        navigateTo: `/events/${r.event_categories.events.id}`,
        sub_el: r.event_categories.title_el,
        sub_en: r.event_categories.title_en,
        dog: r.dogs?.name || null,
      }))

    const seminarItems = (seminarRegs || [])
      .filter((r: any) => r.seminars)
      .map((r: any) => ({
        id: `seminar-${r.id}`,
        type: 'seminar' as const,
        title_el: r.seminars.title_el,
        title_en: r.seminars.title_en,
        date: r.seminars.seminar_date,
        location: r.seminars.is_online ? null : r.seminars.location,
        navigateTo: `/seminars/${r.seminars.id}`,
        sub_el: r.seminars.is_online ? 'Διαδικτυακό' : null,
        sub_en: r.seminars.is_online ? 'Online' : null,
        dog: null,
      }))

    // Merge + sort by date
    const merged = [...eventItems, ...seminarItems].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Client-side pagination on merged results
    const page = merged.slice(currentOffset, currentOffset + PAGE_SIZE)

    if (currentOffset === 0) {
      setItems(page)
    } else {
      setItems(prev => [...prev, ...page])
    }

    setHasMore(merged.length > currentOffset + PAGE_SIZE)
    setLoading(false)
    setLoadingMore(false)
  }

  function handleLoadMore() {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    loadItems(newOffset)
  }

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(t('el-GR', 'en-GB'), {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  if (loading) return null // dashboard already has a loading state

  if (items.length === 0) return null // nothing to show, don't render the section

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
    }}>
      <p style={{
        fontFamily: 'Bebas Neue, sans-serif',
        fontSize: '1rem',
        color: 'var(--accent)',
        margin: '0 0 1rem',
        letterSpacing: '0.04em',
      }}>
        📋 {t('Επερχόμενες Εγγραφές μου', 'My Upcoming Registrations')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => router.push(item.navigateTo)}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem' }}>{item.type === 'event' ? '🏆' : '📚'}</span>
                <p style={{
                  margin: 0,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {t(item.title_el, item.title_en || item.title_el)}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  📅 {formatDate(item.date)}
                </span>
                {item.location && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    📍 {item.location}
                  </span>
                )}
                {item.sub_el && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '99px',
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    color: 'var(--accent)',
                  }}>
                    {t(item.sub_el, item.sub_en || item.sub_el)}
                  </span>
                )}
                {item.dog && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '99px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}>
                    🐕 {item.dog}
                  </span>
                )}
              </div>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.85rem' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '99px',
              padding: '0.35rem 1.25rem',
              color: 'var(--text-secondary)',
              cursor: loadingMore ? 'default' : 'pointer',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '0.8rem',
              fontWeight: 600,
              opacity: loadingMore ? 0.6 : 1,
            }}
          >
            {loadingMore ? t('Φόρτωση...', 'Loading...') : t('Περισσότερα', 'Load More')}
          </button>
        </div>
      )}
    </div>
  )
}
